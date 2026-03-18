'use client'

import { useState } from 'react'

export default function MemoryBanner({ onEnable }: { onEnable: () => void }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('logos_memory_banner_dismissed') === '1'
  })

  if (dismissed) return null

  return (
    <div style={{
      background: 'rgba(139,107,20,0.08)',
      borderTop: '1px solid rgba(139,107,20,0.2)',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderRadius: 4,
      marginTop: 8,
    }}>
      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8B6914' }}>
        Enable Memory — Logos will remember your study context
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={onEnable}
          style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B6914', background: 'rgba(139,107,20,0.1)', border: '1px solid rgba(139,107,20,0.3)', borderRadius: 3, padding: '6px 14px', cursor: 'pointer' }}
        >
          Enable &rarr;
        </button>
        <button
          onClick={() => { setDismissed(true); localStorage.setItem('logos_memory_banner_dismissed', '1') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B6914', fontSize: 16, padding: 4 }}
        >
          &times;
        </button>
      </div>
    </div>
  )
}
