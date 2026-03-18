import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

async function getUserId() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  // Verify Scholar+
  const { data: user } = await db().from('users').select('subscription_tier').eq('id', userId).single()
  if (!['scholar', 'ministry', 'missions'].includes(user?.subscription_tier ?? 'free')) {
    return NextResponse.json({ error: 'Scholar tier required' }, { status: 403 })
  }

  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const format = req.nextUrl.searchParams.get('format') || 'text'

  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const { data: session } = await db().from('ask_sessions').select('messages, updated_at').eq('id', sessionId).eq('user_id', userId).single()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const messages = session.messages as Array<{ role: string; content: string }>
  const date = new Date(session.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  if (format === 'text') {
    let text = `LOGOS BY KAI'ROS — Bible Study Session\n${date}\n${'─'.repeat(40)}\n\n`
    for (const msg of messages) {
      text += `${msg.role === 'user' ? 'Q' : 'A'}: ${msg.content}\n\n${'─'.repeat(40)}\n\n`
    }
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="logos-session-${sessionId.slice(0, 8)}.txt"`,
      },
    })
  }

  // PDF — simple text-based for now
  let text = `LOGOS BY KAI'ROS — Bible Study Session\n${date}\n\n`
  for (const msg of messages) {
    text += `${msg.role === 'user' ? 'QUESTION' : 'ANSWER'}:\n${msg.content}\n\n`
  }
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="logos-session-${sessionId.slice(0, 8)}.txt"`,
    },
  })
}
