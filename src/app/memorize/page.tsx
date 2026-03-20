'use client'

import { useTheme } from '@/contexts/ThemeContext'

export default function MemorizePage() {
  const { theme } = useTheme()
  const m = theme === 'modern'

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', paddingBottom: 70 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontFamily: m ? "'Inter', sans-serif" : 'var(--font-display)', fontSize: m ? 24 : 20, fontWeight: m ? 700 : 400, color: m ? '#1A1A1A' : '#FFD060', marginBottom: 8 }}>
          Scripture Memorization
        </h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: m ? '#555' : 'var(--text-secondary)', marginBottom: '2rem' }}>
          Hide God&apos;s Word in your heart. Coming soon.
        </p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 18, color: m ? '#0F3460' : '#FFD060', lineHeight: 1.6 }}>
          &ldquo;Thy word have I hid in mine heart, that I might not sin against thee.&rdquo;
        </p>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: m ? '#888' : 'var(--text-tertiary)', marginTop: 8 }}>Psalm 119:11 &middot; KJV</p>
      </div>
    </main>
  )
}
