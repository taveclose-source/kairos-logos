'use client'

import { useTheme } from '@/contexts/ThemeContext'

export default function CommunityPage() {
  const { theme } = useTheme()
  const m = theme === 'modern'

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', paddingBottom: 70 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontFamily: m ? "'Inter', sans-serif" : 'var(--font-display)', fontSize: m ? 24 : 20, fontWeight: m ? 700 : 400, color: m ? '#1A1A1A' : '#FFD060', marginBottom: 8 }}>
          Community
        </h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: m ? '#555' : 'var(--text-secondary)', marginBottom: '2rem' }}>
          Study together. Grow together. Coming soon.
        </p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 18, color: m ? '#0F3460' : '#FFD060', lineHeight: 1.6 }}>
          &ldquo;Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.&rdquo;
        </p>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: m ? '#888' : 'var(--text-tertiary)', marginTop: 8 }}>Proverbs 27:17 &middot; KJV</p>
      </div>
    </main>
  )
}
