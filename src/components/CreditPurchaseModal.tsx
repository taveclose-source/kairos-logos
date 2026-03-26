'use client'

import { useState } from 'react'
import { CONVERSATION_BUNDLES } from '@/lib/memoryCredits'

const bundles = Object.entries(CONVERSATION_BUNDLES).map(([priceId, b]) => ({
  priceId,
  ...b,
  perConvo: (b.price / b.conversations).toFixed(2),
  badge: b.label === 'Standard' ? 'Most Popular' : b.label === 'Value' ? 'Best Value' : null,
}))

interface Props {
  onClose: () => void
  inline?: boolean
}

export default function CreditPurchaseModal({ onClose, inline }: Props) {
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

  const content = (
    <div style={inline ? {} : {
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 56,
      background: '#F5EDD9', borderRadius: '16px 16px 0 0',
      borderTop: '2px solid rgba(139,107,20,0.4)',
      padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto',
      animation: 'creditSheetUp 300ms ease-out',
    }}>
      {!inline && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#2C1810' }}>Add Study Sessions</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B6914', fontSize: 20 }}>&times;</button>
        </div>
      )}
      {inline && (
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: 'rgba(255,230,180,0.95)', marginBottom: 12, textAlign: 'center' }}>
          You&apos;ve used all your conversations this month.
        </p>
      )}
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: inline ? 'rgba(255,208,96,0.7)' : '#5C3D11', lineHeight: 1.6, marginBottom: '1.25rem', textAlign: inline ? 'center' : undefined }}>
        Add more Study Sessions to keep walking with the Pastor.
      </p>

      <div style={{ display: 'flex', flexDirection: inline ? 'row' : 'column', gap: 10, marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {bundles.map((b) => (
          <button
            key={b.priceId}
            onClick={() => handlePurchase(b.priceId)}
            disabled={loading === b.priceId}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: inline ? 'center' : 'flex-start',
              padding: inline ? '12px 16px' : '14px 16px',
              border: inline ? '1px solid rgba(255,200,100,0.3)' : '1px solid rgba(139,107,20,0.25)',
              borderRadius: inline ? 8 : 4,
              background: inline ? 'rgba(255,200,100,0.08)' : 'transparent',
              cursor: 'pointer',
              opacity: loading === b.priceId ? 0.5 : 1,
              flex: inline ? '1 1 0' : undefined,
              minWidth: inline ? 90 : undefined,
            }}
          >
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: inline ? '#FFD060' : '#2C1810' }}>
              {b.conversations} Sessions
            </span>
            {b.badge && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: '#8B6914', marginTop: 2, background: 'rgba(139,107,20,0.1)', padding: '2px 6px', borderRadius: 2 }}>{b.badge}</span>}
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: inline ? 'rgba(255,230,180,0.95)' : '#2C1810', marginTop: 4 }}>${b.price}</span>
          </button>
        ))}
      </div>

      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: inline ? 'rgba(255,208,96,0.4)' : '#8B6914', opacity: inline ? 1 : 0.6, textAlign: 'center' }}>
        Purchased Sessions expire after 12 months. Non-refundable.
      </p>
    </div>
  )

  if (inline) return content

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      {content}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes creditSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}} />
    </>
  )
}
