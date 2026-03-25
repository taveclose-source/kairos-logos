import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

async function getUserId() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  try {
    const supabase = db()
    const { data: session } = await supabase
      .from('ask_sessions')
      .select('messages')
      .eq('id', session_id)
      .eq('user_id', userId)
      .single()

    if (!session?.messages || !Array.isArray(session.messages)) {
      return NextResponse.json({ ok: true, topics: [] })
    }

    // Build a condensed version of the conversation
    const msgs = (session.messages as { role: string; content: string }[])
    const condensed = msgs.map(m => `${m.role}: ${m.content.slice(0, 300)}`).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: 'Extract 1-3 overarching Bible study topics from this conversation. Return ONLY a JSON array of short topic strings (2-5 words each). Topics should be theological concepts, doctrines, book themes, or key subjects discussed. Example: ["justification by faith","the book of Romans","imputation of righteousness"]',
      messages: [{ role: 'user', content: condensed }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ ok: true, topics: [] })

    const topics: string[] = JSON.parse(match[0])

    // Upsert topics — deduplicate by (user_id, topic)
    for (const topic of topics) {
      if (typeof topic !== 'string' || topic.length < 2) continue
      await supabase.from('user_topics').upsert(
        { user_id: userId, topic: topic.toLowerCase(), source_session_id: session_id },
        { onConflict: 'user_id,topic' }
      )
    }

    return NextResponse.json({ ok: true, topics })
  } catch {
    return NextResponse.json({ ok: true, topics: [] })
  }
}
