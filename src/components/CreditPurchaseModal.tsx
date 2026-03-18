'use client'

import { useState } from 'react'
import { MEMORY_CREDIT_BUNDLES } from '@/lib/memoryCredits'

const bundles = Object.entries(MEMORY_CREDIT_BUNDLES).map(([priceId, b]) => ({
  priceId,
  ...b,
  perCredit: (b.price / b.credits).toFixed(4),
  badge: b.label === 'Standard' ? 'Most Popular' : b.label === 'Value' ? 'Best Value' : null,
}))

export default function CreditPurchaseModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handlePurchase(priceId: string) {
    setLoading(priceId)
    const res = await fetch('/api/memory/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    })
    const data = await res.json()
    if (data.checkoutUrl) window.location.href = data.checkoutUrl
    else setLoading(null)
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 56,
        background: '#F5EDD9', borderRadius: '16px 16px 0 0',
        borderTop: '2px solid rgba(139,107,20,0.4)',
        padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto',
        animation: 'creditSheetUp 300ms ease-out',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#2C1810' }}>Enable Logos Memory</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B6914', fontSize: 20 }}>&times;</button>
        </div>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#5C3D11', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Logos remembers your study context, books explored, and theological interests across every session.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1rem' }}>
          {bundles.map((b) => (
            <button
              key={b.priceId}
              onClick={() => handlePurchase(b.priceId)}
              disabled={loading === b.priceId}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', border: '1px solid rgba(139,107,20,0.25)',
                borderRadius: 4, background: 'transparent', cursor: 'pointer',
                opacity: loading === b.priceId ? 0.5 : 1,
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: '#2C1810' }}>{b.label}</span>
                {b.badge && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: '#8B6914', marginLeft: 8, background: 'rgba(139,107,20,0.1)', padding: '2px 6px', borderRadius: 2 }}>{b.badge}</span>}
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8B6914', display: 'block', marginTop: 2 }}>{b.credits.toLocaleString()} credits &middot; ${b.perCredit}/credit</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#2C1810' }}>${b.price}</span>
            </button>
          ))}
        </div>

        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#8B6914', opacity: 0.6, textAlign: 'center' }}>
          Memory can be disabled at any time from Settings. Credits are non-refundable.
        </p>
      </div>

      <style jsx>{`
        @keyframes creditSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  )
}
