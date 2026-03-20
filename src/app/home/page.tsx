'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useTheme } from '@/contexts/ThemeContext'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

interface VerseOfDay { book_name: string; chapter: number; verse: number; kjv_text: string; reason?: string }

export default function HomePage() {
  const [user, setUser] = useState<{ id: string; display_name: string; subscription_tier: string } | null>(null)
  const [verse, setVerse] = useState<VerseOfDay | null>(null)
  const [lastRead, setLastRead] = useState<{ book: string; chapter: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { theme } = useTheme()
  const m = theme === 'modern'

  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) { router.push('/auth/signin?redirect=/home'); return }
      const { data: profile } = await sb.from('users').select('display_name, subscription_tier').eq('id', authUser.id).single()
      setUser({ id: authUser.id, display_name: profile?.display_name ?? '', subscription_tier: profile?.subscription_tier ?? 'free' })
      setLoading(false)
    })
    try { const raw = localStorage.getItem('logos_last_read'); if (raw) setLastRead(JSON.parse(raw)) } catch {}
    fetch('/api/home/verse-of-day').then(r => r.json()).then(d => { if (d.kjv_text) setVerse(d) }).catch(() => {})
  }, [router])

  if (loading) return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>Loading...</p></main>

  const name = user?.display_name || 'friend'
  const tier = user?.subscription_tier ?? 'free'
  const isPaid = ['scholar', 'ministry', 'missions'].includes(tier)

  const cardStyle = m
    ? { background: '#FFFFFF', border: '1px solid #ECEAE6', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem' }
    : { background: '#F8F2E2', border: '1px solid rgba(200,160,40,0.3)', borderRadius: 4, padding: '1.25rem', marginBottom: '1rem' }

  const headingStyle = m
    ? { fontFamily: "'Inter', sans-serif", fontWeight: 600, color: '#1A1A1A' }
    : { fontFamily: "'Cinzel', serif", color: '#FFD060' }

  return (
    <main style={{ minHeight: '100vh', paddingBottom: 70 }}>
      {/* Greeting + Verse of Day */}
      <section style={m ? { background: 'linear-gradient(180deg, #0F3460 0%, #16213E 100%)', padding: '2rem 1.5rem', color: '#FFFFFF' } : { padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ ...headingStyle, fontSize: m ? 14 : 16, marginBottom: 12, color: m ? 'rgba(255,255,255,0.6)' : '#FFD060' }}>{getGreeting()}, {name}</p>

          {verse && (
            <div style={m ? { background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem' } : { ...cardStyle, marginBottom: '1rem' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 18, lineHeight: 1.6, color: m ? '#FFD060' : '#1A0A04', marginBottom: 8 }}>
                &ldquo;{verse.kjv_text.replace(/\s*\{[^}]*\}\s*/g, ' ').trim()}&rdquo;
              </p>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: m ? 'rgba(255,255,255,0.5)' : 'var(--text-tertiary)', textAlign: 'right' }}>
                {verse.book_name} {verse.chapter}:{verse.verse} &middot; KJV
              </p>
              {verse.reason && isPaid && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontStyle: 'italic', color: m ? 'rgba(255,255,255,0.35)' : 'var(--text-tertiary)', marginTop: 6 }}>{verse.reason}</p>}
              {!isPaid && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: m ? 'rgba(255,255,255,0.3)' : 'var(--text-tertiary)', marginTop: 6 }}>Free — Upgrade for personalized verses</p>}
            </div>
          )}
        </div>
      </section>

      {/* Content sections */}
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem' }}>
        {/* Continue Reading */}
        {lastRead && (
          <div style={cardStyle}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: m ? '#888' : 'var(--text-tertiary)', marginBottom: 4 }}>Continue Reading</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ ...headingStyle, fontSize: 18 }}>{lastRead.book} {lastRead.chapter}</p>
              <button
                onClick={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); router.prefetch(`/bible/${encodeURIComponent(lastRead.book)}/${lastRead.chapter}`); router.push(`/bible/${encodeURIComponent(lastRead.book)}/${lastRead.chapter}`) }}
                style={{ padding: '8px 20px', background: m ? '#0F3460' : 'var(--gold)', color: m ? '#FFFFFF' : '#1A0A04', borderRadius: m ? 8 : 2, border: 'none', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >Continue</button>
            </div>
          </div>
        )}

        {/* Memorization */}
        <div style={cardStyle}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: m ? '#888' : 'var(--text-tertiary)', marginBottom: 4 }}>Scripture Memorization</p>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: m ? '#1A1A1A' : '#1A0A04', marginBottom: 8 }}>Start memorizing God&apos;s Word</p>
          <Link href="/memorize"><span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: m ? '#0F3460' : 'var(--gold)', fontWeight: 500 }}>Begin &rarr;</span></Link>
        </div>

        {/* Quick Access Books */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: m ? '#888' : 'var(--text-tertiary)', marginBottom: 8 }}>Quick Access</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{ name: 'John', t: 'NT' }, { name: 'Romans', t: 'NT' }, { name: 'Psalms', t: 'OT' }, { name: 'Genesis', t: 'OT' }].map((b) => (
              <Link key={b.name} href={`/bible/${b.name}/1`}>
                <span style={{ display: 'inline-block', padding: '8px 16px', borderRadius: m ? 20 : 2, border: `1px solid ${b.t === 'NT' ? (m ? '#0F3460' : 'var(--gold)') : (m ? '#C8960A' : 'rgba(200,160,40,0.5)')}`, color: m ? (b.t === 'NT' ? '#0F3460' : '#8B5E10') : (b.t === 'NT' ? '#FFD060' : 'var(--text-secondary)'), fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500 }}>{b.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Community */}
        <div style={cardStyle}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: m ? '#888' : 'var(--text-tertiary)', marginBottom: 4 }}>Community</p>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: m ? '#1A1A1A' : '#1A0A04', marginBottom: 8 }}>Join or create a study community</p>
          <Link href="/community"><span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: m ? '#0F3460' : 'var(--gold)', fontWeight: 500 }}>Explore &rarr;</span></Link>
        </div>
      </section>
    </main>
  )
}
