'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface VerseInfo {
  reference: string
  text: string
  book: string
  chapter: number
  verse_number: number
}

interface VerseContextMenuProps {
  verse: VerseInfo
  twiText?: string | null
  position: { x: number; y: number }
  onClose: () => void
  onAskPastor: (verse: VerseInfo) => void
  onKingsKingdoms: (verse: VerseInfo) => void
}

export default function VerseContextMenu({ verse, twiText, position, onClose, onAskPastor, onKingsKingdoms }: VerseContextMenuProps) {
  const { theme } = useTheme()
  const m = theme === 'modern'
  const menuRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState<'kjv' | 'twi' | null>(null)

  function copyVerse(type: 'kjv' | 'twi') {
    const text = type === 'kjv' ? verse.text : (twiText || '')
    const label = type === 'kjv' ? 'KJV' : 'Twi'
    const formatted = `${text} (${verse.reference} ${label})`
    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(type)
      setTimeout(() => onClose(), 800)
    }).catch(() => {})
  }

  // Dismiss on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Use a timeout so the triggering click/contextmenu doesn't immediately dismiss
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 10)
    return () => { clearTimeout(timer); document.removeEventListener('click', handleClick) }
  }, [onClose])

  // Dismiss on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // On mobile (narrow viewport) render as a bottom sheet row; on desktop as floating menu
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  const menuStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', bottom: 44, left: 0, right: 0,
        zIndex: 60,
        background: m ? '#FFFFFF' : '#F8F2E2',
        borderTop: '1px solid rgba(139,107,20,0.3)',
        borderRadius: '12px 12px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.25)',
        animation: 'ctxMenuSlideUp 200ms ease-out',
      }
    : {
        position: 'fixed',
        left: Math.min(position.x, (typeof window !== 'undefined' ? window.innerWidth : 800) - 280),
        top: Math.min(position.y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 140),
        zIndex: 60,
        background: m ? '#FFFFFF' : '#F8F2E2',
        border: '1px solid rgba(139,107,20,0.3)',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        minWidth: 260,
        overflow: 'hidden',
        animation: 'ctxMenuFade 150ms ease-out',
      }

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', textAlign: 'left', padding: '12px 16px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-ui)', fontSize: 13, color: m ? '#1A1A1A' : '#1A0A04',
    transition: 'background 150ms',
  }

  return (
    <>
      {/* Backdrop — mobile only */}
      {isMobile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 59, background: 'rgba(0,0,0,0.2)' }} onClick={onClose} />
      )}

      <div ref={menuRef} style={menuStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header — verse reference */}
        <div style={{ padding: '10px 16px 6px', borderBottom: '1px solid rgba(139,107,20,0.15)' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: m ? '#888' : '#8B5E10' }}>
            {verse.reference}
          </span>
        </div>

        {/* Option 1 — Ask the Pastor */}
        <button
          onClick={() => { onAskPastor(verse); onClose() }}
          style={btnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,107,20,0.06)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>&#128220;</span>
          <span>Ask the Pastor about this verse</span>
        </button>

        {/* Option 2 — Kings and Kingdoms */}
        <button
          onClick={() => { onKingsKingdoms(verse); onClose() }}
          style={btnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,107,20,0.06)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>&#127760;</span>
          <span>What was happening in the world?</span>
        </button>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(139,107,20,0.15)', margin: '2px 16px' }} />

        {/* Option 3 — Copy KJV */}
        <button
          onClick={() => copyVerse('kjv')}
          style={btnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,107,20,0.06)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>&#128203;</span>
          <span>{copied === 'kjv' ? 'Copied!' : 'Copy verse (KJV)'}</span>
        </button>

        {/* Option 4 — Copy Twi (only if Twi text exists) */}
        {twiText && (
          <button
            onClick={() => copyVerse('twi')}
            style={btnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,107,20,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>&#128203;</span>
            <span>{copied === 'twi' ? 'Copied!' : 'Copy verse (Twi)'}</span>
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ctxMenuFade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ctxMenuSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />
    </>
  )
}
