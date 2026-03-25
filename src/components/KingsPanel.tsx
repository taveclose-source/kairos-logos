'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface HerodotusEntry {
  book_number: number
  book_name: string
  chapter: number
  content: string
  proper_nouns: string[] | null
  scripture_connections: string[] | null
  kingdoms: string[] | null
  date_range_start: number | null
  date_range_end: number | null
  source_tier: number
  authority_notice: string
}

interface KingsResult {
  book: string
  chapter: number | null
  date_range: { start: number; end: number } | null
  results: HerodotusEntry[]
  kingdoms: string[]
  by_kingdom: Record<string, HerodotusEntry[]>
  authority_notice: string
  message?: string
}

interface KingsPanelProps {
  bookName: string
  chapter: number
  onClose: () => void
}

function formatDate(bce: number): string {
  if (bce < 0) return `${Math.abs(bce)} BC`
  if (bce === 0) return '1 BC'
  return `AD ${bce}`
}

// Kingdom color coding
const KINGDOM_COLORS: Record<string, string> = {
  'Persia':   '#8B4513',
  'Babylon':  '#B8860B',
  'Egypt':    '#DAA520',
  'Greece':   '#4682B4',
  'Lydia':    '#9370DB',
  'Media':    '#CD853F',
  'Scythia':  '#708090',
  'Assyria':  '#A0522D',
  'Ethiopia': '#2E8B57',
  'India':    '#D2691E',
}

function getKingdomColor(kingdom: string): string {
  return KINGDOM_COLORS[kingdom] || '#8B6914'
}

export default function KingsPanel({ bookName, chapter, onClose }: KingsPanelProps) {
  const [data, setData] = useState<KingsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedKingdom, setSelectedKingdom] = useState<string | null>(null)
  const { theme } = useTheme()
  const m = theme === 'modern'
  const panelBg = m ? '#FFFFFF' : '#F8F2E2'
  const textMain = m ? '#1A1A1A' : '#1A0A04'
  const labelColor = m ? '#888888' : '#8B5E10'

  useEffect(() => {
    setLoading(true)
    fetch(`/api/kings?book=${encodeURIComponent(bookName)}&chapter=${chapter}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [bookName, chapter])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const displayEntries = selectedKingdom && data?.by_kingdom?.[selectedKingdom]
    ? data.by_kingdom[selectedKingdom]
    : data?.results ?? []

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          maxHeight: '80vh', zIndex: 56,
          background: panelBg,
          borderTop: '2px solid rgba(139,107,20,0.4)',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column',
          animation: 'kingsSlideUp 250ms ease-out',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(139,107,20,0.3)', borderRadius: 2, margin: '10px auto' }} />

        {/* Historical Context Badge */}
        <div style={{ textAlign: 'center', marginBottom: 8, flexShrink: 0 }}>
          <span style={{
            display: 'inline-block',
            fontFamily: 'var(--font-ui)',
            fontSize: 9,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#B8860B',
            background: 'rgba(184,134,11,0.1)',
            border: '1px solid rgba(184,134,11,0.25)',
            borderRadius: 3,
            padding: '3px 10px',
          }}>
            Historical Context
          </span>
        </div>

        {/* Header */}
        <div style={{ padding: '0 1.25rem 0.5rem', textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 14, color: labelColor, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 8px' }}>
            What the world looked like at this moment — for context only. The Word speaks for itself.
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '3px', color: 'rgba(200,160,40,0.9)', textTransform: 'uppercase' }}>
            {bookName} {chapter}
          </p>
          {data?.date_range && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: labelColor, marginTop: 4 }}>
              Approximate period: {formatDate(data.date_range.start)} – {formatDate(data.date_range.end)}
            </p>
          )}
        </div>

        {/* Kingdom filter chips */}
        {data?.kingdoms && data.kingdoms.length > 0 && (
          <div style={{ padding: '8px 1.25rem', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedKingdom(null)}
              style={{
                fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '1px',
                color: !selectedKingdom ? '#FFF' : labelColor,
                background: !selectedKingdom ? '#8B6914' : 'rgba(139,107,20,0.06)',
                border: '1px solid rgba(139,107,20,0.25)',
                borderRadius: 12, padding: '4px 12px', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              All Kingdoms
            </button>
            {data.kingdoms.map(k => (
              <button
                key={k}
                onClick={() => setSelectedKingdom(k === selectedKingdom ? null : k)}
                style={{
                  fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '1px',
                  color: selectedKingdom === k ? '#FFF' : getKingdomColor(k),
                  background: selectedKingdom === k ? getKingdomColor(k) : 'rgba(139,107,20,0.06)',
                  border: `1px solid ${getKingdomColor(k)}40`,
                  borderRadius: 12, padding: '4px 12px', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {k}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem 1.5rem', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>
          {loading && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
              Searching the ancient records...
            </p>
          )}

          {!loading && data?.message && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
              {data.message}
            </p>
          )}

          {!loading && displayEntries.length === 0 && !data?.message && (
            <p style={{ fontFamily: 'var(--font-reading)', fontSize: 14, color: labelColor, textAlign: 'center', padding: '2rem 0', lineHeight: 1.8 }}>
              No historical records from Herodotus overlap with this passage&apos;s time period.
              Additional sources (Josephus, Eusebius, Tacitus) will expand coverage in future updates.
            </p>
          )}

          {!loading && displayEntries.map((entry, i) => (
            <div key={`${entry.book_number}-${entry.chapter}-${i}`} style={{ marginBottom: '1.25rem', padding: '12px', background: 'rgba(139,107,20,0.03)', borderRadius: 6, border: '1px solid rgba(139,107,20,0.1)' }}>
              {/* Source line */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor }}>
                  Herodotus — {entry.book_name} {entry.chapter}
                </span>
                {entry.date_range_start && entry.date_range_end && (
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: labelColor }}>
                    {formatDate(entry.date_range_start)} – {formatDate(entry.date_range_end)}
                  </span>
                )}
              </div>

              {/* Kingdom tags */}
              {entry.kingdoms && entry.kingdoms.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                  {entry.kingdoms.map(k => (
                    <span key={k} style={{
                      fontFamily: 'var(--font-ui)', fontSize: 8, letterSpacing: '1px', textTransform: 'uppercase',
                      color: getKingdomColor(k), background: `${getKingdomColor(k)}10`,
                      border: `1px solid ${getKingdomColor(k)}30`,
                      borderRadius: 2, padding: '1px 6px',
                    }}>
                      {k}
                    </span>
                  ))}
                </div>
              )}

              {/* Content */}
              <p style={{ fontFamily: 'var(--font-reading)', fontSize: 14, color: textMain, lineHeight: 1.8 }}>
                {entry.content.length > 400 ? entry.content.slice(0, 400) + '...' : entry.content}
              </p>

              {/* Scripture connections */}
              {entry.scripture_connections && entry.scripture_connections.length > 0 && (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#B8860B', marginTop: 8 }}>
                  Scripture connections: {entry.scripture_connections.join(', ')}
                </p>
              )}
            </div>
          ))}

          {/* Authority notice at bottom */}
          {!loading && displayEntries.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '10px 12px', background: 'rgba(184,134,11,0.06)', borderRadius: 4, border: '1px solid rgba(184,134,11,0.15)' }}>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#B8860B', lineHeight: 1.6, textAlign: 'center' }}>
                {data?.authority_notice || 'These sources are secular historical records. They carry no theological authority. The Bible interprets history. History does not interpret the Bible.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes kingsSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
