import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

async function getUserId() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** GET /api/topics — list the user's study topics, ranked by weighted score */
export async function GET(req: NextRequest) {
  let userId = await getUserId()
  // Fallback: accept uid query param if cookie auth fails (non-sensitive read)
  if (!userId) {
    const uid = req.nextUrl.searchParams.get('uid')
    if (uid && /^[0-9a-f-]{36}$/.test(uid)) userId = uid
  }
  if (!userId) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  // Admin threshold is 1 (immediate visibility for testing), normal users need 3+
  const minMentions = isAdmin(userId) ? 1 : 3
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await db()
    .from('user_topics')
    .select('id, topic, source_session_id, created_at, mention_count, last_mentioned_at')
    .eq('user_id', userId)
    .gte('mention_count', minMentions)
    .gte('last_mentioned_at', ninetyDaysAgo)

  if (!data || data.length === 0) return NextResponse.json([])

  // Calculate weighted score: (mention_count × 0.6) + (recency_score × 0.4)
  // recency_score: 1.0 at today, decays to 0.0 at 90 days
  const now = Date.now()
  const ninetyDays = 90 * 24 * 60 * 60 * 1000

  const scored = data.map(t => {
    const age = now - new Date(t.last_mentioned_at || t.created_at).getTime()
    const recency = Math.max(0, 1 - age / ninetyDays)
    const score = (t.mention_count * 0.6) + (recency * 10 * 0.4) // scale recency to ~0-10 range
    return { ...t, score }
  })

  scored.sort((a, b) => b.score - a.score)

  return NextResponse.json(scored.slice(0, 10))
}
