import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Get current_period_end from a subscription's first item */
async function getSubscriptionPeriodEnd(subscriptionId: string): Promise<string | null> {
  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId, {
      expand: ['items.data'],
    })
    const item = sub.items.data[0]
    if (item?.current_period_end) {
      return new Date(item.current_period_end * 1000).toISOString()
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Return 200 immediately, then process
  const response = NextResponse.json({ received: true })

  const db = supabaseAdmin()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        if (!userId) break

        const isMissionsSponsorship = session.metadata?.tier === 'missions_sponsorship'

        if (isMissionsSponsorship) {
          const applicantId = session.metadata?.applicant_id
          if (applicantId) {
            const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

            await db.from('missions_sponsorships').insert({
              sponsor_id: userId,
              recipient_id: applicantId,
              stripe_payment_id: session.payment_intent as string,
              amount_cents: session.amount_total ?? 9900,
              created_at: new Date().toISOString(),
              expires_at: oneYearFromNow,
            })

            await db.from('users').update({
              subscription_tier: 'missions',
              subscription_status: 'active',
              missions_status: 'active',
              sponsored_by: userId,
              subscription_expires_at: oneYearFromNow,
            }).eq('id', applicantId)
          }
        } else {
          const tier = session.metadata?.tier ?? 'scholar'
          const subscriptionId = session.subscription as string | null
          const expiresAt = subscriptionId ? await getSubscriptionPeriodEnd(subscriptionId) : null

          await db.from('users').update({
            subscription_tier: tier,
            subscription_status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            subscription_expires_at: expiresAt,
          }).eq('id', userId)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subDetail = invoice.parent?.subscription_details?.subscription
        const subscriptionId = typeof subDetail === 'string' ? subDetail : subDetail?.id ?? null
        if (!subscriptionId) break

        const expiresAt = await getSubscriptionPeriodEnd(subscriptionId)

        await db.from('users').update({
          subscription_status: 'active',
          subscription_expires_at: expiresAt,
        }).eq('stripe_subscription_id', subscriptionId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subDetail = invoice.parent?.subscription_details?.subscription
        const subscriptionId = typeof subDetail === 'string' ? subDetail : subDetail?.id ?? null
        if (!subscriptionId) break

        await db.from('users').update({
          subscription_status: 'past_due',
        }).eq('stripe_subscription_id', subscriptionId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await db.from('users').update({
          subscription_tier: 'free',
          subscription_status: 'canceled',
        }).eq('stripe_subscription_id', subscription.id)
        break
      }
    }
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
  }

  return response
}
