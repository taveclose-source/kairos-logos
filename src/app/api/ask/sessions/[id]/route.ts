import { NextRequest, NextResponse } from 'next/server'
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

/** GET /api/ask/sessions/[id] — load a specific session (admin only) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId()
  if (!userId || !isAdmin(userId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { data } = await db()
    .from('ask_sessions')
    .select('id, messages, updated_at')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({
    id: data.id,
    messages: data.messages || [],
    updatedAt: data.updated_at,
  })
}
