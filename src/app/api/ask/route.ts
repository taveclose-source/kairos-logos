import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  AGENT_MODEL,
  shouldRouteToQueue,
  extractReferences,
} from '@/lib/theological-agent'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent-system-prompt'

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

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Support both legacy { question } and new { messages } format
    let messages: ChatMessage[]
    let email: string | undefined
    let lastUserMessage: string

    if (body.messages && Array.isArray(body.messages)) {
      // New conversational format
      messages = body.messages.filter(
        (m: ChatMessage) =>
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      email = body.email
      lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content ?? ''
    } else if (body.question && typeof body.question === 'string') {
      // Legacy single-question format
      let content = body.question.trim()
      if (body.context && typeof body.context === 'string') {
        content = `Context: ${body.context.trim()}\n\nQuestion: ${content}`
      }
      messages = [{ role: 'user', content }]
      email = body.email
      lastUserMessage = body.question.trim()
    } else {
      return NextResponse.json({ error: 'A message is required.' }, { status: 400 })
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: 'A message is required.' }, { status: 400 })
    }

    if (lastUserMessage.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 characters).' }, { status: 400 })
    }

    // Prepend context to the first user message if provided (new format)
    if (body.context && typeof body.context === 'string' && body.messages) {
      const firstUserIdx = messages.findIndex((m) => m.role === 'user')
      if (firstUserIdx !== -1) {
        messages[firstUserIdx] = {
          ...messages[firstUserIdx],
          content: `Context: ${body.context.trim()}\n\n${messages[firstUserIdx].content}`,
        }
      }
    }

    // Memory + model selection
    const userId = await getSessionUserId()
    const serviceDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    let memoryContext = ''
    let memoryEnabled = false
    let userTierLocal = 'free'
    if (userId) {
      const [memRes, credRes, userRes] = await Promise.all([
        serviceDb.from('user_memories').select('memory_enabled, memory_data').eq('user_id', userId).maybeSingle(),
        serviceDb.from('memory_credits').select('credits_remaining').eq('user_id', userId).maybeSingle(),
        serviceDb.from('users').select('subscription_tier').eq('id', userId).single(),
      ])
      memoryEnabled = memRes.data?.memory_enabled === true && (credRes.data?.credits_remaining ?? 0) > 0
      if (memoryEnabled && memRes.data?.memory_data) {
        memoryContext = `\n\nUser study context:\n${JSON.stringify(memRes.data.memory_data)}`
      }
      // Save session for downloads
      const sessionId = body.sessionId || crypto.randomUUID()
      await serviceDb.from('ask_sessions').upsert({ id: sessionId, user_id: userId, messages: body.messages || [], updated_at: new Date().toISOString() }, { onConflict: 'id' })
      // Model by tier
      userTierLocal = userRes.data?.subscription_tier ?? 'free'
    }
    const model = userTierLocal !== 'free' ? AGENT_MODEL : 'claude-haiku-4-5-20251001'

    // Stream from Claude API
    const stream = anthropic.messages.stream({
      model,
      max_tokens: 2048,
      system: AGENT_SYSTEM_PROMPT + memoryContext,
      messages,
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

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'done', routed_to_queue, references })}\n\n`
            )
          )
          controller.close()

          // Deduct memory credits if enabled
          if (memoryEnabled && userId) {
            try {
              const { calculateCreditsUsed } = await import('@/lib/memoryCredits')
              const creditsUsed = calculateCreditsUsed(2500, fullAnswer.length / 4)
              await serviceDb.from('memory_credits').update({
                credits_remaining: Math.max(0, (await serviceDb.from('memory_credits').select('credits_remaining').eq('user_id', userId).single()).data?.credits_remaining - creditsUsed)
              }).eq('user_id', userId)
            } catch {}
          }

          // Queue insertion (fire-and-forget after stream ends)
          if (routed_to_queue) {
            try {
              const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
              )
              const userId = await getSessionUserId()
              const row: Record<string, string | null> = {
                question: lastUserMessage,
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
