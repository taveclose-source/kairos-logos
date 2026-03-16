import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
}

const PRICE_MAP: Record<string, string | undefined> = {
  scholar_monthly: process.env.STRIPE_SCHOLAR_MONTHLY_PRICE_ID,
  scholar_annual: process.env.STRIPE_SCHOLAR_ANNUAL_PRICE_ID,
  ministry_monthly: process.env.STRIPE_MINISTRY_MONTHLY_PRICE_ID,
  ministry_annual: process.env.STRIPE_MINISTRY_ANNUAL_PRICE_ID,
  missions: process.env.STRIPE_MISSIONS_PRICE_ID,
}

export async function POST(req: NextRequest) {
  try {
    const { tier, billing, userId, applicantId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const isMissions = tier === 'missions'
    const priceKey = isMissions ? 'missions' : `${tier}_${billing}`
    const priceId = PRICE_MAP[priceKey]

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid tier or billing option' }, { status: 400 })
    }

    const origin = req.headers.get('origin') || 'https://logos.summitbiblecenter.com'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isMissions ? 'payment' : 'subscription',
      success_url: `${origin}/pricing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        user_id: userId,
        tier: isMissions ? 'missions_sponsorship' : tier,
        ...(applicantId ? { applicant_id: applicantId } : {}),
      },
    }

    const session = await getStripe().checkout.sessions.create(sessionParams)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
