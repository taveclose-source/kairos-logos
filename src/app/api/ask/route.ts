import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import {
  THEOLOGICAL_SYSTEM_PROMPT,
  AGENT_MODEL,
  shouldRouteToQueue,
  extractReferences,
} from '@/lib/theological-agent'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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

    // Call Claude API with theological system prompt
    const message = await anthropic.messages.create({
      model: AGENT_MODEL,
      max_tokens: 2048,
      system: THEOLOGICAL_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const answer =
      message.content[0].type === 'text' ? message.content[0].text : ''

    const routed_to_queue = shouldRouteToQueue(answer)
    const references = extractReferences(answer)

    // If routed to queue, insert into theological_queue
    if (routed_to_queue) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const row: Record<string, string> = {
          question: question.trim(),
          ai_draft: answer,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        }
        if (email && typeof email === 'string' && email.includes('@')) {
          row.submitter_email = email.trim()
        }
        await supabase.from('theological_queue').insert(row)
      } catch (queueError) {
        console.error('Failed to insert into theological_queue:', queueError)
      }
    }

    return NextResponse.json({ answer, routed_to_queue, references })
  } catch (error) {
    console.error('Ask API error:', error)
    return NextResponse.json(
      { error: 'Failed to process your question. Please try again.' },
      { status: 500 }
    )
  }
}
