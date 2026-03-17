'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

const emboss = '0 1px 1px rgba(255,200,100,0.3), 0 -1px 1px rgba(0,0,0,0.4)'

export default function BibleCover({ onOpen }: { onOpen: () => void }) {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: '#4A2008' }}>
      {/* Physical edges */}
      {/* Spine */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 18, background: 'linear-gradient(to right, #1A0802, #2A1002)' }} />
      {/* Fore-edge (gilt) */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 12, background: 'linear-gradient(to left, #C8A050, #E8C070)' }} />
      {/* Head */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#2A1002' }} />
      {/* Tail */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: '#2A1002' }} />

      {/* Leather cover */}
      <div
        style={{
          position: 'absolute',
          top: 8, right: 12, bottom: 8, left: 18,
          backgroundColor: '#6B3515',
          backgroundImage: 'var(--leather-texture)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Decorative border */}
        <div style={{ position: 'absolute', inset: 24, border: '1px solid rgba(200,160,80,0.35)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 30, border: '1px solid rgba(200,160,80,0.15)', pointerEvents: 'none' }} />

        {/* Cover text */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: '#D4A050', letterSpacing: '8px', marginBottom: 8, textShadow: emboss }}>
            HOLY BIBLE
          </h1>
          <p style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: 'clamp(14px, 2vw, 22px)', color: 'rgba(212,160,80,0.75)', letterSpacing: '3px', marginBottom: 32, textShadow: emboss }}>
            King James Version
          </p>
          <div style={{ width: 120, height: 1, background: 'rgba(212,160,80,0.4)', margin: '0 auto 24px' }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(12px, 1.5vw, 18px)', color: 'rgba(212,160,80,0.65)', letterSpacing: '5px', marginBottom: 40, textShadow: emboss }}>
            LOGOS BY KAI&apos;ROS
          </p>
          <div style={{ width: 120, height: 1, background: 'rgba(212,160,80,0.4)', margin: '0 auto 24px' }} />
          <p style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: 'clamp(11px, 1.3vw, 16px)', color: 'rgba(212,160,80,0.55)', lineHeight: 1.8, textAlign: 'center', maxWidth: 320, margin: '0 auto 4px', textShadow: emboss }}>
            He must increase, but I must decrease.
          </p>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '3px', color: 'rgba(212,160,80,0.4)' }}>
            JOHN 3:30
          </p>
        </div>

        {/* Bottom nav + button */}
        <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center' }}>
          {/* Nav links */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 20 }}>
            {[
              { href: '/ask', label: 'Ask' },
              { href: '/why-kjv', label: 'Why KJV?' },
              { href: '/translation', label: 'Translation' },
              { href: '/learn', label: 'Learn' },
              { href: loggedIn ? '/dashboard' : '/auth/signin', label: loggedIn ? 'Dashboard' : 'Sign In' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(212,160,80,0.4)', textDecoration: 'none', transition: 'color 200ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(212,160,80,0.7)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(212,160,80,0.4)')}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Open button */}
          <button
            onClick={onOpen}
            style={{
              fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase',
              color: 'rgba(212,160,80,0.7)', background: 'transparent',
              border: '1px solid rgba(212,160,80,0.3)', padding: '10px 28px',
              borderRadius: 2, cursor: 'pointer', transition: 'all 300ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(212,160,80,1)'; e.currentTarget.style.borderColor = 'rgba(212,160,80,0.7)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(212,160,80,0.7)'; e.currentTarget.style.borderColor = 'rgba(212,160,80,0.3)' }}
          >
            Open the Bible
          </button>
        </div>
      </div>
    </div>
  )
}
