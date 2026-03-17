'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { playPageTurn } from '@/lib/paperSound'
import { useSwipe } from '@/hooks/useSwipe'

const emboss = '0 1px 2px rgba(0,0,0,0.6), 0 -1px 1px rgba(255,200,80,0.2)'

export default function BibleCover({ onOpen }: { onOpen: () => void }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
    if (!localStorage.getItem('logos_cover_swiped')) setShowHint(true)
  }, [])

  const handleOpen = useCallback(() => {
    if (showHint) {
      setShowHint(false)
      localStorage.setItem('logos_cover_swiped', '1')
    }
    playPageTurn('forward')
    setTimeout(() => onOpen(), 80)
  }, [onOpen, showHint])

  const noop = useCallback(() => {}, [])
  const swipe = useSwipe(handleOpen, noop)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 40, background: '#4A2008' }}
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
      onMouseDown={swipe.onMouseDown}
      onMouseUp={swipe.onMouseUp}
    >
      {/* Physical edges */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 18, background: 'linear-gradient(to right, #1A0802, #2A1002)' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 12, background: 'linear-gradient(to left, #C8A050, #E8C070)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#2A1002' }} />
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

        {/* Swipe hint chevron */}
        {showHint && (
          <div style={{ position: 'absolute', right: 20, top: '50%', color: 'rgba(240,192,96,0.65)', fontSize: 20, pointerEvents: 'none', animation: 'coverPulse 6s ease-in-out infinite', zIndex: 2 }}>
            &#x203A;
          </div>
        )}

        {/* Cover text */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, color: '#F0C060', letterSpacing: '8px', marginBottom: 8, textShadow: emboss }}>
            HOLY BIBLE
          </h1>
          <p style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: 'clamp(14px, 2vw, 22px)', color: 'rgba(240,192,96,0.90)', letterSpacing: '3px', marginBottom: 32, textShadow: emboss }}>
            King James Version
          </p>
          <div style={{ width: 120, height: 1, background: 'rgba(240,192,96,0.55)', margin: '0 auto 24px' }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(12px, 1.5vw, 18px)', color: 'rgba(240,192,96,0.80)', letterSpacing: '5px', marginBottom: 40, textShadow: emboss }}>
            LOGOS BY KAI&apos;ROS
          </p>
          <div style={{ width: 120, height: 1, background: 'rgba(240,192,96,0.55)', margin: '0 auto 24px' }} />
          <p style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: 'clamp(11px, 1.3vw, 16px)', color: 'rgba(240,192,96,0.78)', lineHeight: 1.8, textAlign: 'center', maxWidth: 320, margin: '0 auto 4px', textShadow: emboss }}>
            He must increase, but I must decrease.
          </p>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '3px', color: 'rgba(240,192,96,0.60)' }}>
            JOHN 3:30
          </p>
        </div>

        {/* Bottom nav + button */}
        <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center' }}>
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
                style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(240,192,96,0.65)', textDecoration: 'none', transition: 'color 200ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(240,192,96,0.95)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(240,192,96,0.65)')}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            onClick={handleOpen}
            style={{
              fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase',
              color: 'rgba(240,192,96,0.90)', background: 'transparent',
              border: '1px solid rgba(240,192,96,0.55)', padding: '10px 28px',
              borderRadius: 2, cursor: 'pointer', transition: 'all 300ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(240,192,96,1)'; e.currentTarget.style.borderColor = 'rgba(240,192,96,0.8)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(240,192,96,0.90)'; e.currentTarget.style.borderColor = 'rgba(240,192,96,0.55)' }}
          >
            Open the Bible
          </button>

          {showHint && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', color: 'rgba(240,192,96,0.55)', marginTop: 8 }}>
              or swipe to open
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes coverPulse {
          0%, 85%, 100% { opacity: 0.4; transform: translateY(-50%) translateX(0); }
          90% { opacity: 0.8; transform: translateY(-50%) translateX(4px); }
          95% { opacity: 0.4; transform: translateY(-50%) translateX(0); }
        }
      `}</style>
    </div>
  )
}
