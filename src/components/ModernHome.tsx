'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function ModernHome() {
  const [lastRead, setLastRead] = useState<{ book: string; chapter: number } | null>(null)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('logos_last_read')
      if (raw) setLastRead(JSON.parse(raw))
    } catch {}
    const sb = createSupabaseBrowser()
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await sb.from('users').select('display_name').eq('id', user.id).single()
        setDisplayName(data?.display_name ?? '')
      }
    })
  }, [])

  const isReturning = !!lastRead
  const name = displayName || 'friend'

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF9' }}>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(180deg, #0F3460 0%, #16213E 100%)', padding: 'clamp(2rem, 8vh, 4rem) 1.5rem', color: '#FFFFFF' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {isReturning ? (
            <>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 8 }}>
                {getGreeting()}, {name}
              </p>
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Continue reading</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 600 }}>{lastRead.book} {lastRead.chapter}</p>
                </div>
                <Link href={`/bible/${encodeURIComponent(lastRead.book)}/${lastRead.chapter}`}>
                  <span style={{ display: 'inline-block', padding: '10px 24px', background: '#FFD060', color: '#0F3460', borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600 }}>Continue</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* John 3:30 highlighted */}
              <div style={{ borderLeft: '3px solid #FFD060', paddingLeft: 16, marginBottom: '2rem' }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(24px, 4vw, 36px)', fontStyle: 'italic', color: '#FFD060', lineHeight: 1.4, marginBottom: 8 }}>
                  &ldquo;He must increase, but I must decrease.&rdquo;
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>John 3:30 &middot; KJV</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <Link href="/bible">
                  <span style={{ display: 'inline-block', padding: '12px 28px', background: '#FFD060', color: '#0F3460', borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600 }}>Open Bible</span>
                </Link>
                <Link href="/study">
                  <span style={{ display: 'inline-block', padding: '12px 28px', border: '1px solid rgba(255,255,255,0.3)', color: '#FFFFFF', borderRadius: 8, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500 }}>Ask the Word</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Content below hero */}
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {!isReturning && (
          <>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#1A1A1A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Start reading</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '2rem' }}>
              {[
                { name: 'John', testament: 'NT' },
                { name: 'Romans', testament: 'NT' },
                { name: 'Psalms', testament: 'OT' },
                { name: 'Genesis', testament: 'OT' },
              ].map((b) => (
                <Link key={b.name} href={`/bible/${b.name}/1`}>
                  <span style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 20, border: `1px solid ${b.testament === 'NT' ? '#0F3460' : '#C8960A'}`, color: b.testament === 'NT' ? '#0F3460' : '#8B5E10', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500 }}>{b.name}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <Link href="/study" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #ECEAE6', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#888', marginBottom: 4 }}>Try asking</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#1A1A1A', fontWeight: 500 }}>&ldquo;What does grace mean?&rdquo;</p>
          </div>
        </Link>
      </section>
    </div>
  )
}
