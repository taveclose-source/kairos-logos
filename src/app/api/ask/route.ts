import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  THEOLOGICAL_SYSTEM_PROMPT,
  AGENT_MODEL,
  shouldRouteToQueue,
  extractReferences,
} from '@/lib/theological-agent'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // ignore
            }
          },
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { question, context, email } = await req.json()

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 })
    }

    if (question.trim().length > 2000) {
      return NextResponse.json({ error: 'Question too long (max 2000 characters).' }, { status: 400 })
    }

    // Build user message
    let userMessage = question.trim()
    if (context && typeof context === 'string') {
      userMessage = `Context: ${context.trim()}\n\nQuestion: ${userMessage}`
    }

    // Stream from Claude API
    const stream = anthropic.messages.stream({
      model: AGENT_MODEL,
      max_tokens: 2048,
      system: THEOLOGICAL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    let fullAnswer = ''

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        stream.on('text', (text) => {
          fullAnswer += text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`))
        })

        stream.on('end', async () => {
          const routed_to_queue = shouldRouteToQueue(fullAnswer)
          const references = extractReferences(fullAnswer)

          // Send final metadata
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'done', routed_to_queue, references })}\n\n`
            )
          )
          controller.close()

          // Queue insertion (fire-and-forget after stream ends)
          if (routed_to_queue) {
            try {
              const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
              )
              const userId = await getSessionUserId()
              const row: Record<string, string | null> = {
                question: question.trim(),
                ai_draft: fullAnswer,
                status: 'pending',
                submitted_at: new Date().toISOString(),
              }
              if (userId) row.user_id = userId
              if (email && typeof email === 'string' && email.includes('@')) {
                row.submitter_email = email.trim()
              }
              await supabase.from('theological_queue').insert(row)
            } catch (queueError) {
              console.error('Failed to insert into theological_queue:', queueError)
            }
          }
        })

        stream.on('error', (err) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(err) })}\n\n`)
          )
          controller.close()
        })
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Ask API error:', error)
    return NextResponse.json(
      { error: 'Failed to process your question. Please try again.' },
      { status: 500 }
    )
  }
}
