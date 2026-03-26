import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_ID = '2f4cc459-6fdd-4f41-be4b-754770b28529'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

async function verifyAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id === ADMIN_ID
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const { tier } = body

  const updates: Record<string, string> = {
    subscription_tier: tier,
    subscription_status: tier === 'free' ? 'canceled' : 'active',
  }
  // Support missions_status for approve/deny actions
  if (typeof body.missions_status === 'string') {
    updates.missions_status = body.missions_status
  }

  const { data, error } = await db().from('users').update(updates)
    .eq('id', id).select('id, subscription_tier').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync free monthly conversations to tier allocation
  const TIER_CONVOS: Record<string, number> = { free: 0, scholar: 30, ministry: 60, missions: 30 }
  const allocation = TIER_CONVOS[tier] ?? 0
  const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)
  await db().from('memory_credits').upsert({
    user_id: id,
    credits_remaining: 0,
    free_conversations: allocation,
    free_conversations_reset_date: nextMonth,
  }, { onConflict: 'user_id' })

  return NextResponse.json(data)
}
