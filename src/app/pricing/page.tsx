'use client'

import { useState, useEffect, Suspense } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

type Billing = 'monthly' | 'annual'

const TIERS = [
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'For the serious Bible student',
    monthly: 9.99,
    annual: 99,
    features: [
      'Unlimited Ask agent queries',
      'Voice playback on answers',
      'Full Strong\'s concordance',
      'Glossary highlights',
      'Pastor\'s Helps library',
    ],
    cta: 'Start Studying',
    highlight: false,
  },
  {
    id: 'ministry',
    name: 'Ministry',
    description: 'For pastors, churches, and study groups',
    monthly: 29.99,
    annual: 299,
    features: [
      'Everything in Scholar',
      'Multi-seat access for your team',
      'Ministry networking tools',
      'Priority pastoral queue',
      'Custom organization branding',
    ],
    cta: 'Equip Your Ministry',
    highlight: true,
  },
]

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  )
}

function PricingContent() {
  const [billing, setBilling] = useState<Billing>('annual')
  const [loading, setLoading] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const { theme } = useTheme()
  const m = theme === 'modern'
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  async function handleCheckout(tier: string) {
    if (!userId) {
      window.location.href = `/auth/signin?redirect=/pricing`
      return
    }
    setLoading(tier)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, billing, userId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoading(null)
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12" style={{ background: m ? '#FAFAF9' : undefined, minHeight: '100vh' }}>
      <p className="text-sm font-medium text-emerald-700 tracking-wide uppercase text-center">
        Logos by Kai&rsquo;Ros
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-2 text-center">
        Support the Mission. Study the Word.
      </h1>
      <p className="text-gray-500 mb-8 text-center max-w-2xl mx-auto">
        Every subscription funds Bible translation, the Ghana campus, and free access for believers who can&rsquo;t afford it.
      </p>

      {success && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-center text-sm text-emerald-700">
          Welcome aboard — your subscription is active. Thank you for supporting the mission.
        </div>
      )}
      {canceled && (
        <div className="mb-6 rounded-xl bg-gray-50 border border-gray-200 px-5 py-4 text-center text-sm text-gray-600">
          Checkout was canceled. No charge was made.
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <button
          onClick={() => setBilling('monthly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billing === 'monthly'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling('annual')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billing === 'annual'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Annual
        </button>
        {billing === 'annual' && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            Save up to 17%
          </span>
        )}
      </div>

      {/* Tier cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`relative rounded-2xl border p-6 flex flex-col ${
              tier.highlight
                ? 'border-emerald-300 bg-emerald-50/30 shadow-lg'
                : 'border-gray-200 bg-white'
            }`}
          >
            {tier.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Most Impact
              </span>
            )}
            <h2 className="text-xl font-bold text-gray-900">{tier.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{tier.description}</p>
            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold text-gray-900">
                ${billing === 'monthly' ? tier.monthly : tier.annual}
              </span>
              <span className="text-gray-400 text-sm ml-1">
                /{billing === 'monthly' ? 'mo' : 'yr'}
              </span>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(tier.id)}
              disabled={loading === tier.id}
              className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${
                tier.highlight
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              } disabled:opacity-50`}
            >
              {loading === tier.id ? 'Redirecting…' : tier.cta}
            </button>
          </div>
        ))}

        {/* Missions tier */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900">Missions</h2>
          <p className="text-sm text-gray-500 mt-1">
            Full access for believers in the field — funded by sponsors
          </p>
          <div className="mt-4 mb-6">
            <span className="text-4xl font-bold text-gray-900">Free</span>
            <span className="text-gray-400 text-sm ml-1">when sponsored</span>
          </div>
          <ul className="space-y-2 mb-6 flex-1">
            {[
              'Everything in Scholar',
              'Funded by a sponsor — $99/year',
              'Full platform access',
              'Twi-primary interface',
              'Designed for Ghana & West Africa',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <Link
              href="/missions/apply"
              className="block w-full text-center py-3 rounded-xl font-medium text-sm bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              Apply for Missions Access
            </Link>
            <Link
              href="/missions/sponsor"
              className="block w-full text-center py-3 rounded-xl font-medium text-sm bg-white text-amber-700 border border-amber-300 hover:bg-amber-50 transition-colors"
            >
              Sponsor Someone — $99/year
            </Link>
          </div>
        </div>
      </div>

      {/* Free tier comparison */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-5">
        <h3 className="font-semibold text-gray-800 mb-3">Free Tier — Always Available</h3>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm text-gray-600">
          <p>Full KJV Bible with parallel Twi</p>
          <p>Strong&rsquo;s concordance and word study</p>
          <p>Glossary and translation notes</p>
          <p>10 Ask agent queries per day</p>
          <p>Why KJV? apologetics module</p>
          <p>Twi learning flashcards</p>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          No credit card required. Upgrade anytime to unlock unlimited access.
        </p>
      </div>
      {/* Memory Add-on Section */}
      <div style={{ width: '100%', height: 1, background: 'rgba(139,107,20,0.3)', margin: '3rem 0' }} />

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: '#2C1810', marginBottom: 8 }}>Logos Memory</h2>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 16, color: '#8B6914', marginBottom: 16 }}>
          Let Logos remember your study journey across every session.
        </p>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B6914', marginBottom: '1.5rem' }}>
          Available to Scholar and Ministry subscribers
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'STARTER', credits: '600', price: '$2.99', perCredit: '$0.005 per query', badge: null, border: '1px solid rgba(139,107,20,0.25)', note: null },
          { label: 'STANDARD', credits: '1,000', price: '$4.99', perCredit: '$0.005 per query', badge: 'MOST POPULAR', border: '2px solid rgba(139,107,20,0.5)', note: null },
          { label: 'VALUE', credits: '2,100', price: '$9.99', perCredit: '$0.0047 per query', badge: 'BEST VALUE', border: '1px solid rgba(139,107,20,0.25)', note: '5% bonus credits included' },
        ].map((b) => (
          <div key={b.label} style={{ background: '#F5EDD9', border: b.border, borderRadius: 4, padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
            {b.badge && (
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B6914', background: 'rgba(139,107,20,0.15)', padding: '3px 8px', borderRadius: 2, display: 'inline-block', marginBottom: 8 }}>{b.badge}</span>
            )}
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '3px', color: '#8B6914', marginBottom: 8 }}>{b.label}</p>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 22, color: '#2C1810', marginBottom: 4 }}>{b.credits} credits</p>
            <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 32, color: '#2C1810', marginBottom: 4 }}>{b.price}</p>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#8B6914', opacity: 0.7 }}>{b.perCredit}</p>
            {b.note && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontStyle: 'italic', color: '#8B6914', opacity: 0.6, marginTop: 4 }}>{b.note}</p>}
            <Link href={userId ? '/settings/memory' : '/auth/signup?redirect=/settings/memory'}>
              <span style={{ display: 'inline-block', marginTop: 12, padding: '8px 24px', background: 'var(--gold, #C8965A)', color: '#2C1810', fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', borderRadius: 2, cursor: 'pointer' }}>Get Started</span>
            </Link>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mb-6" style={{ maxWidth: 500, margin: '0 auto 1.5rem' }}>
        {['Logos remembers your study context', 'Books and topics explored saved', 'Theological interests tracked', 'Enable or disable anytime', 'Auto-reload available', 'Credits never expire'].map((f) => (
          <p key={f} style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#2C1810' }}>&#x2713; {f}</p>
        ))}
      </div>

      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#8B6914', opacity: 0.5, fontStyle: 'italic', textAlign: 'center', marginTop: '1.5rem', maxWidth: 500, margin: '1.5rem auto 0' }}>
        Requires active Scholar or Ministry subscription. Credits are non-refundable. Memory can be disabled at any time from Settings — your saved context is preserved.
      </p>
    </main>
  )
}
