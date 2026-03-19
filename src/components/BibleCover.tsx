'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { playPageTurn } from '@/lib/paperSound'
import { useSwipe } from '@/hooks/useSwipe'
import { useTheme } from '@/contexts/ThemeContext'

const emboss = '0 2px 4px rgba(0,0,0,0.7), 0 -1px 2px rgba(255,220,100,0.5), 0 0 12px rgba(255,200,60,0.2)'
const goldLine = 'linear-gradient(to right, rgba(240,192,80,0.6), rgba(255,220,120,1.0), rgba(240,192,80,0.6))'
const goldLineShadow = '0 1px 2px rgba(0,0,0,0.5), 0 -0.5px 1px rgba(255,220,120,0.3)'

export default function BibleCover({ onOpen }: { onOpen: () => void }) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { setTheme } = useTheme()

  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
    if (!localStorage.getItem('logos_cover_swiped')) setShowHint(true)
  }, [])

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [menuOpen])

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

  const menuItems = [
    { href: '/ask', label: 'Ask' },
    { href: '/why-kjv', label: 'Why KJV?' },
    { href: '/translation', label: 'Translation' },
    { href: '/learn', label: 'Learn' },
    null, // divider
    loggedIn ? { href: '/dashboard', label: 'Dashboard' } : { href: '/auth/signin', label: 'Sign In' },
  ]

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
        <div style={{ position: 'absolute', inset: 24, border: '1px solid rgba(255,200,80,0.6)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 30, border: '1px solid rgba(255,200,80,0.25)', pointerEvents: 'none' }} />

        {/* Gold hamburger menu — top right */}
        <div ref={menuRef} style={{ position: 'absolute', top: 24, right: 24, zIndex: 100 }} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="transition-all duration-200"
            style={{
              border: '1px solid rgba(240,192,80,0.25)',
              padding: '8px 10px',
              borderRadius: 3,
              background: 'rgba(0,0,0,0.1)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(240,192,80,0.5)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(240,192,80,0.25)' }}
          >
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 22, height: 2, background: goldLine, boxShadow: goldLineShadow, borderRadius: 1 }} />
            ))}
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              className="transition-all duration-200"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#5A2A0A',
                backgroundImage: 'var(--leather-texture)',
                border: '1px solid rgba(240,192,80,0.4)',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,220,120,0.15)',
                padding: '6px 0',
                minWidth: 180,
                zIndex: 100,
                opacity: 1,
                transform: 'translateY(0)',
              }}
            >
              {menuItems.map((item, i) =>
                item === null ? (
                  <div key={`div-${i}`} style={{ borderBottom: '0.5px solid rgba(240,192,80,0.12)', margin: '2px 0' }} />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'block',
                      padding: '10px 20px',
                      fontFamily: 'var(--font-ui)',
                      fontSize: 14,
                      letterSpacing: '3px',
                      textTransform: 'uppercase',
                      color: 'rgba(255,208,64,0.95)',
                      textDecoration: 'none',
                      transition: 'all 150ms',
                      borderBottom: i < menuItems.length - 1 && menuItems[i + 1] !== null ? '0.5px solid rgba(240,192,80,0.12)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'rgba(255,220,120,1.0)'
                      e.currentTarget.style.background = 'rgba(255,200,80,0.06)'
                      e.currentTarget.style.textShadow = '0 0 8px rgba(255,200,80,0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(240,192,80,0.85)'
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.textShadow = 'none'
                    }}
                  >
                    {item.label}
                  </Link>
                )
              )}
              {/* Theme toggle */}
              <div style={{ borderTop: '0.5px solid rgba(240,192,80,0.12)', margin: '4px 0', padding: '6px 20px' }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(240,192,80,0.5)', marginBottom: 6 }}>Appearance</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setMenuOpen(false) }} style={{ padding: '5px 12px', borderRadius: 3, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '2px', background: 'rgba(139,107,20,0.3)', border: '1px solid rgba(255,208,64,0.5)', color: '#FFD060', cursor: 'pointer' }}>Classic</button>
                  <button onClick={() => { setTheme('modern'); setMenuOpen(false) }} style={{ padding: '5px 12px', borderRadius: 3, fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 500, background: 'transparent', border: '1px solid rgba(255,208,64,0.3)', color: 'rgba(255,208,64,0.7)', cursor: 'pointer' }}>Modern</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Swipe hint chevron */}
        {showHint && (
          <div style={{ position: 'absolute', right: 20, top: '50%', color: 'rgba(240,192,96,0.65)', fontSize: 20, pointerEvents: 'none', animation: 'coverPulse 6s ease-in-out infinite', zIndex: 2 }}>
            &#x203A;
          </div>
        )}

        {/* Cover text */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, color: '#FFD060', letterSpacing: '7px', marginBottom: 8, textShadow: emboss }}>
            HOLY BIBLE
          </h1>
          <p style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: 'clamp(16px, 2.2vw, 24px)', color: '#F5C860', letterSpacing: '3px', marginBottom: 32, textShadow: emboss }}>
            King James Version
          </p>
          <div style={{ width: 100, height: 1, background: 'rgba(255,200,80,0.65)', margin: '0 auto 24px' }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(14px, 1.8vw, 20px)', color: '#EDB850', letterSpacing: '6px', marginBottom: 40, textShadow: emboss }}>
            LOGOS BY KAI&apos;ROS
          </p>
          <div style={{ width: 100, height: 1, background: 'rgba(255,200,80,0.65)', margin: '0 auto 24px' }} />
          <p style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: 'clamp(13px, 1.5vw, 18px)', color: '#E8B048', lineHeight: 1.8, textAlign: 'center', maxWidth: 320, margin: '0 auto 4px', textShadow: emboss }}>
            He must increase, but I must decrease.
          </p>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '4px', color: '#D8A040' }}>
            JOHN 3:30
          </p>
        </div>

        {/* Bottom: Open button only */}
        <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center' }}>
          <button
            onClick={handleOpen}
            style={{
              fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase',
              color: '#FFD060', background: 'transparent',
              border: '1px solid rgba(255,200,80,0.6)', padding: '10px 28px',
              borderRadius: 2, cursor: 'pointer', transition: 'all 300ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FFE080'; e.currentTarget.style.borderColor = 'rgba(255,220,80,0.9)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#FFD060'; e.currentTarget.style.borderColor = 'rgba(255,200,80,0.6)' }}
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
