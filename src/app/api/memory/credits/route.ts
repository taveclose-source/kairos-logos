import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { CONVERSATION_BUNDLES, FREE_MONTHLY_CONVERSATIONS } from '@/lib/memoryCredits'
import { isAdmin } from '@/lib/permissions'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }
function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' }) }

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

  if (isAdmin(userId)) {
    return NextResponse.json({ free_conversations: 999999, purchased_conversations: 0, total: 999999, auto_reload: false, is_admin: true })
  }

  const supabase = db()
  const [credRes, txnRes] = await Promise.all([
    supabase.from('memory_credits').select('free_conversations, free_conversations_reset_date, auto_reload').eq('user_id', userId).maybeSingle(),
    supabase.from('memory_credit_transactions').select('remaining').eq('user_id', userId).gt('remaining', 0).gte('expires_at', new Date().toISOString()),
  ])

  // Check monthly reset
  let freeConvos = Number(credRes.data?.free_conversations ?? 0)
  const resetDate = credRes.data?.free_conversations_reset_date
  if (resetDate && new Date(resetDate) <= new Date()) {
    freeConvos = FREE_MONTHLY_CONVERSATIONS
    await supabase.from('memory_credits').upsert({
      user_id: userId,
      free_conversations: FREE_MONTHLY_CONVERSATIONS,
      free_conversations_reset_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10),
    }, { onConflict: 'user_id' })
  }

  const purchasedConvos = (txnRes.data ?? []).reduce((sum: number, t: { remaining: number }) => sum + Number(t.remaining), 0)

  return NextResponse.json({
    free_conversations: freeConvos,
    purchased_conversations: purchasedConvos,
    total: freeConvos + purchasedConvos,
    auto_reload: credRes.data?.auto_reload ?? false,
  })
}

export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const { priceId } = await req.json()
  if (!priceId || !CONVERSATION_BUNDLES[priceId]) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }

  if (!isAdmin(userId)) {
    const { data: user } = await db().from('users').select('subscription_tier').eq('id', userId).single()
    const tier = user?.subscription_tier ?? 'free'
    if (!['scholar', 'ministry', 'missions'].includes(tier)) {
      return NextResponse.json({ error: 'Scholar tier required' }, { status: 403 })
    }
  }

  const origin = req.headers.get('origin') || 'https://logos.summitbiblecenter.com'
  const session = await getStripe().checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'payment',
    success_url: `${origin}/settings/memory?success=true`,
    cancel_url: `${origin}/settings/memory?canceled=true`,
    metadata: { user_id: userId, price_id: priceId, type: 'memory_credits' },
  })

  return NextResponse.json({ checkoutUrl: session.url })
}
