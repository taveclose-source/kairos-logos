import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isAdmin } from '@/lib/permissions'
import { FREE_MONTHLY_CONVERSATIONS } from '@/lib/memoryCredits'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

async function getUserId() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const supabase = db()
  const [memRes, credRes, txnRes, userRes] = await Promise.all([
    supabase.from('user_memories').select('memory_enabled, memory_data').eq('user_id', userId).maybeSingle(),
    supabase.from('memory_credits').select('credits_remaining, auto_reload, free_conversations, free_conversations_reset_date').eq('user_id', userId).maybeSingle(),
    supabase.from('memory_credit_transactions').select('remaining').eq('user_id', userId).gt('remaining', 0).gte('expires_at', new Date().toISOString()),
    supabase.from('users').select('subscription_tier').eq('id', userId).single(),
  ])

  const tier = userRes.data?.subscription_tier ?? 'free'
  const isScholarPlus = ['scholar', 'ministry', 'missions'].includes(tier)

  // Reset free conversations if past reset date
  let freeConvos = Number(credRes.data?.free_conversations ?? 0)
  const resetDate = credRes.data?.free_conversations_reset_date
  if (isScholarPlus && resetDate && new Date(resetDate) <= new Date()) {
    freeConvos = FREE_MONTHLY_CONVERSATIONS
    await supabase.from('memory_credits').upsert({
      user_id: userId,
      free_conversations: FREE_MONTHLY_CONVERSATIONS,
      free_conversations_reset_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10),
    }, { onConflict: 'user_id' })
  }

  // Sum purchased conversations from active transactions
  const purchasedConvos = (txnRes.data ?? []).reduce((sum: number, t: { remaining: number }) => sum + Number(t.remaining), 0)

  return NextResponse.json({
    memory_enabled: memRes.data?.memory_enabled ?? false,
    memory_data: memRes.data?.memory_data ?? {},
    credits_remaining: isAdmin(userId) ? 999999 : (freeConvos + purchasedConvos),
    free_conversations: isAdmin(userId) ? 999999 : freeConvos,
    purchased_conversations: isAdmin(userId) ? 0 : purchasedConvos,
    auto_reload: credRes.data?.auto_reload ?? false,
    tier,
  })
}

export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const { memory_update } = await req.json()
  const supabase = db()

  const { data: existing } = await supabase.from('user_memories').select('memory_data').eq('user_id', userId).maybeSingle()
  const merged = { ...(existing?.memory_data ?? {}), ...memory_update, last_updated: new Date().toISOString() }

  // Trim to keep under ~2000 tokens
  const stringified = JSON.stringify(merged)
  const trimmed = stringified.length > 8000 ? JSON.parse(stringified.slice(0, 8000) + '}') : merged

  await supabase.from('user_memories').upsert({ user_id: userId, memory_data: trimmed, memory_enabled: existing?.memory_data ? true : false }, { onConflict: 'user_id' })

  return NextResponse.json({ ok: true })
}
