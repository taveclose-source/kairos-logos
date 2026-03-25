import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { MEMORY_CREDIT_BUNDLES } from '@/lib/memoryCredits'
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

  // Admin gets unlimited credits — never prompted to purchase
  if (isAdmin(userId)) {
    return NextResponse.json({ credits_remaining: 999999, auto_reload: false, is_admin: true })
  }

  const { data } = await db().from('memory_credits').select('credits_remaining, auto_reload').eq('user_id', userId).maybeSingle()
  return NextResponse.json({ credits_remaining: data?.credits_remaining ?? 0, auto_reload: data?.auto_reload ?? false })
}

export async function POST(req: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const { priceId } = await req.json()
  if (!priceId || !MEMORY_CREDIT_BUNDLES[priceId]) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }

  // Admin bypasses tier check (though admin should never need to purchase)
  if (!isAdmin(userId)) {
    // Verify Scholar+ tier
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
