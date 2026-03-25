'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface NamesResult {
  name: string
  hitchcock: {
    name: string
    meaning: string
    language_origin: string | null
    gender: string | null
    scripture_refs: string[] | null
    strongs_number: string | null
    notes: string | null
  } | null
  smiths: {
    topic: string
    definition: string
    scripture_refs: string[] | null
    strongs_numbers: string[] | null
    see_also: string[] | null
    entry_type: string | null
  } | null
  gesenius: {
    strongs_number: string
    hebrew_word: string | null
    transliteration: string | null
    definition: string
    extended_definition: string
    root: string | null
    cognates: string | null
    scripture_refs: string[] | null
  } | null
  strongs: {
    strongs_number: string
    original_word: string
    transliteration: string | null
    pronunciation: string | null
    definition: string | null
    part_of_speech: string | null
    kjv_usage: string | null
  } | null
}

interface NamesPanelProps {
  name: string
  onClose: () => void
  onStrongsOpen?: (number: string, word: string) => void
}

export default function NamesPanel({ name, onClose, onStrongsOpen }: NamesPanelProps) {
  const [data, setData] = useState<NamesResult | null>(null)
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const m = theme === 'modern'
  const panelBg = m ? '#FFFFFF' : '#F8F2E2'
  const textMain = m ? '#1A1A1A' : '#1A0A04'
  const labelColor = m ? '#888888' : '#8B5E10'
  const accentColor = m ? '#0F3460' : '#C8960A'

  useEffect(() => {
    setLoading(true)
    fetch(`/api/names/${encodeURIComponent(name)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [name])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          maxHeight: '70vh', zIndex: 56,
          background: panelBg,
          borderTop: '2px solid rgba(139,107,20,0.4)',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column',
          animation: 'namesSlideUp 250ms ease-out',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(139,107,20,0.3)', borderRadius: 2, margin: '10px auto' }} />

        {/* Header */}
        <div style={{ padding: '0 1.25rem 0.75rem', textAlign: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.6)', display: 'block', marginBottom: 4 }}>
            Biblical Name
          </span>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: textMain, display: 'block', marginBottom: 4 }}>
            {name}
          </span>
          {data?.hitchcock?.meaning && (
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 16, color: accentColor, display: 'block' }}>
              &ldquo;{data.hitchcock.meaning}&rdquo;
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1.5rem', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>
          {loading && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
              Looking up {name}...
            </p>
          )}

          {!loading && !data?.hitchcock && !data?.smiths && !data?.gesenius && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
              No entries found for &ldquo;{name}&rdquo;
            </p>
          )}

          {/* ── HITCHCOCK'S — Meaning ── */}
          {data?.hitchcock && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor }}>
                  Hitchcock&apos;s Bible Names
                </p>
                <div style={{ flex: 1, height: 1, background: 'rgba(139,107,20,0.15)' }} />
              </div>
              <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8, marginBottom: 6 }}>
                <strong>{data.hitchcock.name}</strong> — {data.hitchcock.meaning}
              </p>
              {data.hitchcock.language_origin && (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: labelColor }}>
                  Origin: {data.hitchcock.language_origin}
                </p>
              )}
              {data.hitchcock.strongs_number && (
                <button
                  onClick={() => onStrongsOpen?.(data.hitchcock!.strongs_number!, name)}
                  style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: accentColor, background: 'rgba(139,107,20,0.08)', border: '1px solid rgba(139,107,20,0.25)', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', marginTop: 4 }}
                >
                  Strong&apos;s {data.hitchcock.strongs_number}
                </button>
              )}
              {data.hitchcock.scripture_refs && data.hitchcock.scripture_refs.length > 0 && (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, marginTop: 6 }}>
                  Scripture: {data.hitchcock.scripture_refs.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* ── SMITH'S — Cultural Context ── */}
          {data?.smiths && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor }}>
                  Smith&apos;s Bible Dictionary
                </p>
                <div style={{ flex: 1, height: 1, background: 'rgba(139,107,20,0.15)' }} />
              </div>
              {data.smiths.entry_type && (
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.6)', display: 'inline-block', marginBottom: 6, background: 'rgba(139,107,20,0.06)', padding: '2px 6px', borderRadius: 2 }}>
                  {data.smiths.entry_type}
                </span>
              )}
              <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8 }}>
                {data.smiths.definition.length > 600
                  ? data.smiths.definition.slice(0, 600) + '...'
                  : data.smiths.definition}
              </p>
              {data.smiths.see_also && data.smiths.see_also.length > 0 && (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, marginTop: 6 }}>
                  See also: {data.smiths.see_also.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* ── GESENIUS — Hebrew Root Etymology ── */}
          {data?.gesenius && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor }}>
                  Gesenius&apos; Hebrew-Chaldee Lexicon
                </p>
                <div style={{ flex: 1, height: 1, background: 'rgba(139,107,20,0.15)' }} />
              </div>
              {data.gesenius.hebrew_word && (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: textMain, marginBottom: 4 }}>
                  {data.gesenius.hebrew_word}
                </p>
              )}
              {data.gesenius.transliteration && (
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15, color: accentColor, marginBottom: 6 }}>
                  {data.gesenius.transliteration}
                </p>
              )}
              <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8, marginBottom: 6 }}>
                {data.gesenius.definition}
              </p>
              {data.gesenius.extended_definition && data.gesenius.extended_definition !== data.gesenius.definition && (
                <p style={{ fontFamily: 'var(--font-reading)', fontSize: 14, color: textMain, lineHeight: 1.8, opacity: 0.85 }}>
                  {data.gesenius.extended_definition.length > 500
                    ? data.gesenius.extended_definition.slice(0, 500) + '...'
                    : data.gesenius.extended_definition}
                </p>
              )}
              {data.gesenius.root && (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: labelColor, marginTop: 4 }}>
                  Root: {data.gesenius.root}
                </p>
              )}
              {data.gesenius.cognates && (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: labelColor, marginTop: 2 }}>
                  Cognates: {data.gesenius.cognates}
                </p>
              )}
            </div>
          )}

          {/* ── STRONG'S Cross-Reference ── */}
          {data?.strongs && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor }}>
                  Strong&apos;s Reference
                </p>
                <div style={{ flex: 1, height: 1, background: 'rgba(139,107,20,0.15)' }} />
              </div>
              <button
                onClick={() => onStrongsOpen?.(data.strongs!.strongs_number, name)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'rgba(139,107,20,0.04)', border: '1px solid rgba(139,107,20,0.15)', borderRadius: 6, cursor: 'pointer' }}
              >
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: textMain }}>{data.strongs.original_word}</span>
                {data.strongs.transliteration && (
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 14, color: accentColor, marginLeft: 8 }}>{data.strongs.transliteration}</span>
                )}
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, display: 'block', marginTop: 2 }}>{data.strongs.strongs_number} — {data.strongs.part_of_speech}</span>
                {data.strongs.definition && (
                  <span style={{ fontFamily: 'var(--font-reading)', fontSize: 13, color: textMain, display: 'block', marginTop: 4, lineHeight: 1.6 }}>
                    {data.strongs.definition.length > 200 ? data.strongs.definition.slice(0, 200) + '...' : data.strongs.definition}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes namesSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
