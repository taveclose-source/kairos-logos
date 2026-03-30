'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface KingsPanelProps {
  bookName: string
  chapter: number
  onClose: () => void
}

export default function KingsPanel({ bookName, chapter, onClose }: KingsPanelProps) {
  const [narrative, setNarrative] = useState('')
  const [sources, setSources] = useState<string[]>([])
  const [streaming, setStreaming] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { theme } = useTheme()
  const m = theme === 'modern'
  const panelBg = m ? '#FFFFFF' : '#F8F2E2'
  const textMain = m ? '#1A1A1A' : '#1A0A04'
  const labelColor = m ? '#888888' : '#8B5E10'
  const accentColor = m ? '#0F3460' : '#C8960A'

  useEffect(() => {
    const abort = new AbortController()
    abortRef.current = abort
    setNarrative('')
    setSources([])
    setStreaming(true)
    setError(null)

    async function fetchStream() {
      try {
        const res = await fetch('/api/kings/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ book: bookName, chapter }),
          signal: abort.signal,
        })
        if (!res.ok) { setError('Could not load historical context.'); setStreaming(false); return }

        const reader = res.body?.getReader()
        if (!reader) return
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.replace(/^data: /, '').trim()
            if (!trimmed) continue
            try {
              const evt = JSON.parse(trimmed)
              if (evt.type === 'sources') setSources(evt.sources || [])
              else if (evt.type === 'text') setNarrative(prev => prev + evt.text)
              else if (evt.type === 'done') { setSources(evt.sources || []); setStreaming(false) }
              else if (evt.type === 'error') { setError(evt.error); setStreaming(false) }
            } catch {}
          }
        }
        setStreaming(false)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') { setError('Connection lost.'); setStreaming(false) }
      }
    }

    fetchStream()
    return () => { abort.abort() }
  }, [bookName, chapter])

  // Auto-scroll while streaming
  useEffect(() => {
    if (contentRef.current && streaming) contentRef.current.scrollTop = contentRef.current.scrollHeight
  }, [narrative, streaming])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          maxHeight: '80vh', zIndex: 56, background: panelBg,
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
            display: 'inline-block', fontFamily: 'var(--font-ui)', fontSize: 9,
            letterSpacing: '2px', textTransform: 'uppercase', color: '#B8860B',
            background: 'rgba(184,134,11,0.1)', border: '1px solid rgba(184,134,11,0.25)',
            borderRadius: 3, padding: '3px 10px',
          }}>
            Historical Context
          </span>
        </div>

        {/* Header */}
        <div style={{ padding: '0 1.25rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '3px', color: accentColor, textTransform: 'uppercase' }}>
              {bookName} {chapter}
            </p>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, color: labelColor, marginTop: 2 }}>
              What the world looked like when this was written
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: labelColor, fontSize: 20, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>&times;</button>
        </div>

        {/* Narrative content */}
        <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.25rem 1.5rem', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>
          {error && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#B91C1C', textAlign: 'center', padding: '2rem 0' }}>{error}</p>}

          {!error && narrative.length === 0 && streaming && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
              The Pastor is reading the ancient records...
            </p>
          )}

          {narrative.length > 0 && (
            <div style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.85 }}>
              {narrative.split(/\n\n+/).map((para, i) => {
                const trimmed = para.trim()
                if (!trimmed) return null
                // Strip the [Historical Context] badge if present — we already show it above
                const cleaned = trimmed.replace(/^\[Historical Context\]\s*/i, '')
                return (
                  <p key={i} style={{ marginBottom: '0.85rem', borderLeft: i === 0 ? '3px solid rgba(184,134,11,0.3)' : 'none', paddingLeft: i === 0 ? 12 : 0 }}>
                    {cleaned}
                  </p>
                )
              })}
              {streaming && (
                <span style={{ display: 'inline-block', width: 6, height: 16, background: accentColor, opacity: 0.6, animation: 'kingsBlink 800ms infinite', verticalAlign: 'text-bottom', marginLeft: 2 }} />
              )}
            </div>
          )}

          {/* Source attribution */}
          {!streaming && sources.length > 0 && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, opacity: 0.6, marginTop: '1rem', textAlign: 'center' }}>
              Sources: {sources.join(', ')}
            </p>
          )}

          {/* Authority notice */}
          {!streaming && narrative.length > 0 && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: labelColor, opacity: 0.4, marginTop: 8, textAlign: 'center' }}>
              Historical context only — the Word speaks for itself.
            </p>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kingsSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes kingsBlink { 0%, 100% { opacity: 0.6; } 50% { opacity: 0; } }
      `}} />
    </>
  )
}
