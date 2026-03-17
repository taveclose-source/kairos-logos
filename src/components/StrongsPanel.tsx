'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'lexicon' | 'strongs' | 'english'

interface StrongsEntry {
  strongs_number: string
  original_word: string
  transliteration: string | null
  definition: string | null
  part_of_speech: string | null
  kjv_usage: string | null
  testament: string
}

interface ConcordanceResult {
  book: string
  chapter: number
  verse: number
  kjv_text: string
}

interface StrongsPanelProps {
  strongsNumber: string
  englishWord: string
  onClose: () => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'lexicon', label: 'Lexicon' },
  { id: 'strongs', label: "Strong's Concordance" },
  { id: 'english', label: 'English Concordance' },
]

export default function StrongsPanel({ strongsNumber, englishWord, onClose }: StrongsPanelProps) {
  const [entry, setEntry] = useState<StrongsEntry | null>(null)
  const [tab, setTab] = useState<Tab>('lexicon')
  const [strongsResults, setStrongsResults] = useState<ConcordanceResult[]>([])
  const [englishResults, setEnglishResults] = useState<ConcordanceResult[]>([])
  const [strongsTotal, setStrongsTotal] = useState(0)
  const [englishTotal, setEnglishTotal] = useState(0)
  const [loadingStrongs, setLoadingStrongs] = useState(false)
  const [loadingEnglish, setLoadingEnglish] = useState(false)
  const [strongsFetched, setStrongsFetched] = useState(false)
  const [englishFetched, setEnglishFetched] = useState(false)
  const router = useRouter()

  // Fetch lexicon entry immediately
  useEffect(() => {
    fetch(`/api/strongs/${encodeURIComponent(strongsNumber)}`)
      .then(r => r.json())
      .then(data => { if (data.strongs_number) setEntry(data) })
      .catch(() => {})
  }, [strongsNumber])

  // Lazy load Strong's concordance
  useEffect(() => {
    if (tab !== 'strongs' || strongsFetched) return
    setLoadingStrongs(true)
    fetch('/api/strongs/concordance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strongsNumber, page: 0, limit: 100 }),
    })
      .then(r => r.json())
      .then(data => {
        setStrongsResults(data.results ?? [])
        setStrongsTotal(data.total ?? 0)
        setStrongsFetched(true)
        setLoadingStrongs(false)
      })
      .catch(() => setLoadingStrongs(false))
  }, [tab, strongsNumber, strongsFetched])

  // Lazy load English concordance
  useEffect(() => {
    if (tab !== 'english' || englishFetched || !entry) return
    setLoadingEnglish(true)
    fetch('/api/strongs/concordance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ englishWord, testament: entry.testament, page: 0, limit: 100 }),
    })
      .then(r => r.json())
      .then(data => {
        setEnglishResults(data.results ?? [])
        setEnglishTotal(data.total ?? 0)
        setEnglishFetched(true)
        setLoadingEnglish(false)
      })
      .catch(() => setLoadingEnglish(false))
  }, [tab, englishWord, entry, englishFetched])

  // Escape to dismiss
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const navigateTo = useCallback((book: string, chapter: number) => {
    onClose()
    router.push(`/bible/${encodeURIComponent(book)}/${chapter}`)
  }, [onClose, router])

  function highlightWord(text: string, word: string) {
    const clean = text.replace(/\s*\{[^}]*\}\s*/g, ' ').trim()
    const regex = new RegExp(`(\\b${word.replace(/[^a-zA-Z'-]/g, '')}\\b)`, 'gi')
    const parts = clean.split(regex)
    return parts.map((p, i) =>
      regex.test(p) ? <span key={i} style={{ color: '#8B6914', fontWeight: 600 }}>{p}</span> : p
    )
  }

  function renderResults(results: ConcordanceResult[], total: number, loading: boolean, word: string) {
    if (loading) return <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8B6914', textAlign: 'center', padding: '2rem 0' }}>Loading concordance...</p>
    if (results.length === 0) return <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8B6914', textAlign: 'center', padding: '2rem 0' }}>No occurrences found.</p>
    return (
      <>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#8B6914', letterSpacing: '1px', marginBottom: '1rem' }}>
          {total} occurrence{total !== 1 ? 's' : ''}{total > 100 ? ' (showing first 100)' : ''}
        </p>
        <div style={{ maxHeight: 'calc(60vh - 220px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>
          {results.map((r, i) => (
            <button
              key={`${r.book}-${r.chapter}-${r.verse}-${i}`}
              onClick={() => navigateTo(r.book, r.chapter)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 0', borderBottom: '0.5px solid rgba(139,107,20,0.15)', background: 'none', border: 'none', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(139,107,20,0.15)', cursor: 'pointer' }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#8B6914', letterSpacing: '2px' }}>
                {r.book} {r.chapter}:{r.verse}
              </span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#2C1810', lineHeight: 1.6, marginTop: 2 }}>
                {highlightWord(r.kjv_text, word)}
              </p>
            </button>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />

      {/* Panel */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: '60vh',
          zIndex: 56,
          background: '#F5EDD9',
          borderTop: '2px solid rgba(139,107,20,0.4)',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 250ms ease-out',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(139,107,20,0.3)', borderRadius: 2, margin: '10px auto' }} />

        {/* Header */}
        <div style={{ padding: '0 1.25rem 0.75rem', textAlign: 'center', flexShrink: 0 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: '#8B6914', letterSpacing: '3px' }}>{strongsNumber}</p>
          {entry?.original_word && (
            <p style={{ fontFamily: 'var(--font-reading)', fontSize: 28, color: '#2C1810', margin: '4px 0 2px' }}>{entry.original_word}</p>
          )}
          {entry?.transliteration && (
            <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 14, color: '#8B6914' }}>{entry.transliteration}</p>
          )}
          {entry?.part_of_speech && (
            <p style={{ fontFamily: 'var(--font-ui)', fontStyle: 'italic', fontSize: 10, color: '#8B6914', marginTop: 4 }}>{entry.part_of_speech}</p>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(139,107,20,0.2)', flexShrink: 0, padding: '0 1.25rem' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase',
                color: tab === t.id ? '#2C1810' : '#8B6914',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 12px', position: 'relative',
                borderBottom: tab === t.id ? '2px solid #8B6914' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>
          {tab === 'lexicon' && entry && (
            <>
              {entry.definition && (
                <p style={{ fontFamily: 'var(--font-reading)', fontSize: 16, color: '#2C1810', lineHeight: 1.8, marginBottom: '1rem' }}>{entry.definition}</p>
              )}
              {entry.kjv_usage && (
                <div style={{ borderTop: '1px solid rgba(139,107,20,0.2)', paddingTop: '0.75rem' }}>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B6914', marginBottom: 4 }}>KJV Usage</p>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#5C3D11', lineHeight: 1.6 }}>{entry.kjv_usage}</p>
                </div>
              )}
            </>
          )}

          {tab === 'strongs' && renderResults(strongsResults, strongsTotal, loadingStrongs, englishWord)}

          {tab === 'english' && renderResults(englishResults, englishTotal, loadingEnglish, englishWord)}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
