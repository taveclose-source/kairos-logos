import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/permissions'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

async function getUserId() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** GET /api/ask/sessions — list past sessions (admin only) */
export async function GET() {
  const userId = await getUserId()
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { data } = await db()
    .from('ask_sessions')
    .select('id, messages, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50)

  // Build summaries: session id, first user message as title, message count, date
  const sessions = (data || []).map(s => {
    const msgs = s.messages as { role: string; content: string }[] || []
    const firstUser = msgs.find(m => m.role === 'user')
    const title = firstUser?.content?.slice(0, 80) || 'Untitled'
    return {
      id: s.id,
      title: title.length === 80 ? title + '...' : title,
      messageCount: msgs.length,
      updatedAt: s.updated_at,
    }
  }).filter(s => s.messageCount > 0)

  return NextResponse.json(sessions)
}
