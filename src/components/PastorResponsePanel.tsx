'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface VerseInfo {
  reference: string
  text: string
  book: string
  chapter: number
  verse_number: number
}

interface PastorResponsePanelProps {
  verse: VerseInfo
  context: { before: string[]; after: string[] }
  onClose: () => void
  onGoDeeper?: (word: string, strongsNumber?: string) => void
}

export default function PastorResponsePanel({ verse, context, onClose, onGoDeeper }: PastorResponsePanelProps) {
  const { theme } = useTheme()
  const m = theme === 'modern'
  const panelBg = m ? '#FFFFFF' : '#F8F2E2'
  const textMain = m ? '#1A1A1A' : '#1A0A04'
  const labelColor = m ? '#888888' : '#8B5E10'
  const accentColor = m ? '#0F3460' : '#C8960A'

  const [responseText, setResponseText] = useState('')
  const [sources, setSources] = useState<string[]>([])
  const [streaming, setStreaming] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Stream the Pastor response
  useEffect(() => {
    const abort = new AbortController()
    abortRef.current = abort
    setResponseText('')
    setSources([])
    setStreaming(true)
    setError(null)

    async function fetchStream() {
      try {
        const res = await fetch('/api/pastor/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: verse.reference,
            verse_text: verse.text,
            context_before: context.before,
            context_after: context.after,
            book: verse.book,
            chapter: verse.chapter,
            verse: verse.verse_number,
          }),
          signal: abort.signal,
        })

        if (!res.ok) {
          setError('Failed to reach the Pastor. Please try again.')
          setStreaming(false)
          return
        }

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
              if (evt.type === 'sources') {
                setSources(evt.sources || [])
              } else if (evt.type === 'text') {
                setResponseText(prev => prev + evt.text)
              } else if (evt.type === 'done') {
                setStreaming(false)
              } else if (evt.type === 'error') {
                setError(evt.error || 'An error occurred.')
                setStreaming(false)
              }
            } catch {}
          }
        }
        setStreaming(false)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Connection lost. Please try again.')
          setStreaming(false)
        }
      }
    }

    fetchStream()
    return () => { abort.abort() }
  }, [verse, context])

  // Auto-scroll as text streams
  useEffect(() => {
    if (contentRef.current && streaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [responseText, streaming])

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Render response text with inline source badge highlighting
  const renderResponse = useCallback((text: string) => {
    // Split on source tags like [Strong's], [Historical Context], etc.
    const tagPattern = /(\[(?:Strong's|Gesenius|Hitchcock's|Smith's|Nave's|Historical Context)\])/gi
    const parts = text.split(tagPattern)

    return parts.map((part, i) => {
      // Source badge
      if (tagPattern.test(part)) {
        const label = part.replace(/[\[\]]/g, '')
        const isHistorical = label.toLowerCase() === 'historical context'
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-ui)',
              fontSize: 8,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: isHistorical ? '#8B4513' : accentColor,
              background: isHistorical ? 'rgba(139,69,19,0.08)' : 'rgba(139,107,20,0.08)',
              border: `1px solid ${isHistorical ? 'rgba(139,69,19,0.25)' : 'rgba(139,107,20,0.2)'}`,
              borderRadius: 3,
              padding: '1px 5px',
              marginLeft: 2,
              marginRight: 2,
              verticalAlign: 'middle',
            }}
          >
            {label}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }, [accentColor])

  // Parse paragraphs for rendering
  const renderFormattedResponse = useCallback((text: string) => {
    const paragraphs = text.split(/\n\n+/)
    return paragraphs.map((para, i) => {
      const trimmed = para.trim()
      if (!trimmed) return null

      // Detect Historical Context paragraphs
      const isHistorical = /^\[Historical Context\]|^Historically speaking/i.test(trimmed)

      return (
        <div
          key={i}
          style={{
            marginBottom: '0.85rem',
            padding: isHistorical ? '10px 12px' : 0,
            background: isHistorical ? 'rgba(139,69,19,0.04)' : 'transparent',
            borderLeft: isHistorical ? '3px solid rgba(139,69,19,0.3)' : 'none',
            borderRadius: isHistorical ? '0 4px 4px 0' : 0,
          }}
        >
          <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.85, margin: 0 }}>
            {renderResponse(trimmed)}
          </p>
        </div>
      )
    })
  }, [textMain, renderResponse])

  // Source badge colors
  const badgeStyle = (src: string): React.CSSProperties => {
    const isHistorical = src === 'Historical'
    return {
      display: 'inline-block',
      fontFamily: 'var(--font-ui)',
      fontSize: 8,
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      color: isHistorical ? '#8B4513' : accentColor,
      background: isHistorical ? 'rgba(139,69,19,0.06)' : 'rgba(139,107,20,0.06)',
      border: `1px solid ${isHistorical ? 'rgba(139,69,19,0.2)' : 'rgba(139,107,20,0.15)'}`,
      borderRadius: 3,
      padding: '2px 6px',
      marginRight: 4,
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: '80vh', maxHeight: '80vh',
          zIndex: 56, background: panelBg,
          borderTop: '2px solid rgba(139,107,20,0.4)',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column',
          animation: 'pastorSlideUp 300ms ease-out',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(139,107,20,0.3)', borderRadius: 2, margin: '10px auto' }} />

        {/* Header */}
        <div style={{ padding: '0 1.25rem 0.75rem', flexShrink: 0, borderBottom: '1px solid rgba(139,107,20,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.6)', display: 'block', marginBottom: 2 }}>
                The Pastor
              </span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: textMain }}>
                {verse.reference}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'var(--font-ui)', fontSize: 18, color: labelColor,
                background: 'none', border: 'none', cursor: 'pointer',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', transition: 'background 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,107,20,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              &times;
            </button>
          </div>
          {/* Source badges */}
          {sources.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {sources.map(src => (
                <span key={src} style={badgeStyle(src)}>{src}</span>
              ))}
            </div>
          )}
        </div>

        {/* Response body */}
        <div
          ref={contentRef}
          style={{
            flex: 1, overflowY: 'auto', padding: '1rem 1.25rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(139,107,20,0.3) transparent',
          }}
        >
          {error && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#B91C1C', textAlign: 'center', padding: '2rem 0' }}>
              {error}
            </p>
          )}

          {!error && responseText.length === 0 && streaming && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
              The Pastor is studying the passage...
            </p>
          )}

          {responseText.length > 0 && renderFormattedResponse(responseText)}

          {/* Streaming indicator */}
          {streaming && responseText.length > 0 && (
            <span style={{
              display: 'inline-block',
              width: 6, height: 16,
              background: accentColor,
              opacity: 0.6,
              animation: 'pastorBlink 800ms infinite',
              verticalAlign: 'text-bottom',
              marginLeft: 2,
            }} />
          )}
        </div>

        {/* Footer — Go Deeper */}
        {!streaming && responseText.length > 0 && (
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(139,107,20,0.15)', flexShrink: 0 }}>
            <button
              onClick={() => {
                // Extract first significant word from the verse for Resources panel
                const words = verse.text.split(/\s+/).map(w => w.replace(/[^a-zA-Z'-]/g, '')).filter(w => w.length >= 3)
                const firstWord = words[0] || verse.text.split(/\s+/)[0] || ''
                onGoDeeper?.(firstWord)
                onClose()
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '10px 0',
                fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase',
                color: accentColor, background: 'rgba(139,107,20,0.06)',
                border: '1px solid rgba(139,107,20,0.2)', borderRadius: 6,
                cursor: 'pointer', transition: 'background 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,107,20,0.12)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139,107,20,0.06)' }}
            >
              Go deeper &mdash; open Resources
            </button>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pastorSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes pastorBlink {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0; }
        }
      `}} />
    </>
  )
}
