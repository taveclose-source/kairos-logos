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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const supabase = db()
  const [credRes, txnRes] = await Promise.all([
    supabase.from('memory_credits').select('credits_remaining, free_conversations').eq('user_id', id).maybeSingle(),
    supabase.from('memory_credit_transactions').select('remaining').eq('user_id', id).gt('remaining', 0).gte('expires_at', new Date().toISOString()),
  ])
  const free = Number(credRes.data?.free_conversations ?? 0)
  const purchased = (txnRes.data ?? []).reduce((sum: number, t: { remaining: number }) => sum + Number(t.remaining), 0)
  return NextResponse.json({ credits_remaining: free + purchased, free_conversations: free, purchased_conversations: purchased })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const supabase = db()

  const amount = typeof body.add_credits === 'number' ? body.add_credits : Number(body.credits ?? 0)
  if (amount <= 0) return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })

  // Create a purchased conversation transaction (12-month expiry)
  const { error } = await supabase.from('memory_credit_transactions').insert({
    user_id: id,
    amount,
    remaining: amount,
    purchased_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
