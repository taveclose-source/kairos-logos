'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'kjv' | 'strongs' | 'english'

interface StrongsEntry {
  strongs_number: string
  original_word: string
  transliteration: string | null
  definition: string | null
  part_of_speech: string | null
  kjv_usage: string | null
  testament: string
  strongs_def: string | null
  outline_of_biblical_usage: string | null
  pronunciation: string | null
  derivation: string | null
  root_words: string | null
  total_nt_occurrences: number | null
  total_ot_occurrences: number | null
  all_kjv_translations: string | null
  webster: { word: string; definition: string; part_of_speech: string | null; etymology: string | null } | null
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
  { id: 'kjv', label: "Webster's 1828" },
  { id: 'strongs', label: "Strong's Concordance" },
  { id: 'english', label: 'English Concordance' },
]

export default function StrongsPanel({ strongsNumber, englishWord, onClose }: StrongsPanelProps) {
  const [entry, setEntry] = useState<StrongsEntry | null>(null)
  const [currentNumber, setCurrentNumber] = useState(strongsNumber)
  const [currentWord] = useState(englishWord)
  const [numberStack, setNumberStack] = useState<string[]>([])
  const [tab, setTab] = useState<Tab>('kjv')

  // Strong's concordance (entire Bible)
  const [strongsResults, setStrongsResults] = useState<ConcordanceResult[]>([])
  const [strongsTotal, setStrongsTotal] = useState(0)
  const [loadingStrongs, setLoadingStrongs] = useState(false)
  const [strongsFetched, setStrongsFetched] = useState(false)

  // English concordance
  const [englishResults, setEnglishResults] = useState<ConcordanceResult[]>([])
  const [englishTotal, setEnglishTotal] = useState(0)
  const [loadingEnglish, setLoadingEnglish] = useState(false)
  const [englishFetched, setEnglishFetched] = useState(false)

  const router = useRouter()

  // Fetch Strong's entry + Webster's on number change
  useEffect(() => {
    setEntry(null)
    fetch(`/api/strongs/${encodeURIComponent(currentNumber)}?word=${encodeURIComponent(currentWord)}`)
      .then(r => r.json())
      .then(data => { if (data.strongs_number) setEntry(data) })
      .catch(() => {})
  }, [currentNumber, currentWord])

  // Lazy load Strong's concordance (entire Bible)
  useEffect(() => {
    if (tab !== 'strongs' || strongsFetched) return
    setLoadingStrongs(true)
    fetch('/api/strongs/concordance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strongsNumber: currentNumber, page: 0, limit: 100 }),
    })
      .then(r => r.json())
      .then(data => { setStrongsResults(data.results ?? []); setStrongsTotal(data.total ?? 0); setStrongsFetched(true); setLoadingStrongs(false) })
      .catch(() => setLoadingStrongs(false))
  }, [tab, currentNumber, strongsFetched])

  // Lazy load English concordance
  useEffect(() => {
    if (tab !== 'english' || englishFetched || !entry) return
    setLoadingEnglish(true)
    fetch('/api/strongs/concordance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ englishWord: currentWord, testament: entry.testament, page: 0, limit: 100 }),
    })
      .then(r => r.json())
      .then(data => { setEnglishResults(data.results ?? []); setEnglishTotal(data.total ?? 0); setEnglishFetched(true); setLoadingEnglish(false) })
      .catch(() => setLoadingEnglish(false))
  }, [tab, currentWord, entry, englishFetched])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function navigateToRoot(num: string) {
    setNumberStack(prev => [...prev, currentNumber])
    setCurrentNumber(num)
    setTab('strongs')
    setStrongsFetched(false); setEnglishFetched(false)
  }

  function navigateBack() {
    const prev = numberStack[numberStack.length - 1]
    if (prev) {
      setNumberStack(s => s.slice(0, -1))
      setCurrentNumber(prev)
      setTab('kjv')
      setStrongsFetched(false); setEnglishFetched(false)
    }
  }

  function renderWithStrongsLinks(text: string) {
    const parts = text.split(/([GH]\d+)/g)
    return parts.map((part, i) =>
      /^[GH]\d+$/.test(part) ? (
        <span key={i} onClick={() => navigateToRoot(part)} style={{ color: '#8B5E10', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' }}>{part}</span>
      ) : part
    )
  }

  const navigateTo = useCallback((book: string, chapter: number) => {
    onClose()
    router.push(`/bible/${encodeURIComponent(book)}/${chapter}`)
  }, [onClose, router])

  function highlightWord(text: string, word: string) {
    const clean = text.replace(/\s*\{[^}]*\}\s*/g, ' ').trim()
    const escaped = word.replace(/[^a-zA-Z'-]/g, '')
    if (!escaped) return clean
    const regex = new RegExp(`(\\b${escaped}\\b)`, 'gi')
    const parts = clean.split(regex)
    return parts.map((p, i) =>
      regex.test(p) ? <span key={i} style={{ color: '#8B5E10', fontWeight: 600 }}>{p}</span> : p
    )
  }

  function renderResults(results: ConcordanceResult[], total: number, loading: boolean, word: string, header?: string) {
    if (loading) return <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8B5E10', textAlign: 'center', padding: '2rem 0' }}>Loading concordance...</p>
    if (results.length === 0) return <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8B5E10', textAlign: 'center', padding: '2rem 0' }}>No occurrences found.</p>
    return (
      <>
        {header && <p style={{ fontFamily: 'var(--font-ui)', fontStyle: 'italic', fontSize: 10, color: '#8B5E10', marginBottom: '0.5rem' }}>{header}</p>}
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#8B5E10', letterSpacing: '1px', marginBottom: '1rem' }}>
          {total} occurrence{total !== 1 ? 's' : ''}{total > 100 ? ' (showing first 100)' : ''}
        </p>
        <div style={{ maxHeight: 'calc(60vh - 240px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>
          {results.map((r, i) => (
            <button key={`${r.book}-${r.chapter}-${r.verse}-${i}`} onClick={() => navigateTo(r.book, r.chapter)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 0', background: 'none', border: 'none', borderBottom: '0.5px solid rgba(139,107,20,0.15)', cursor: 'pointer' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#8B5E10', letterSpacing: '2px' }}>{r.book} {r.chapter}:{r.verse}</span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#1A0A04', lineHeight: 1.6, marginTop: 2 }}>{highlightWord(r.kjv_text, word)}</p>
            </button>
          ))}
        </div>
      </>
    )
  }

  const testamentLabel = entry?.testament === 'OT' ? 'Old Testament' : 'New Testament'

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '60vh', zIndex: 56, background: '#F8F2E2', borderTop: '2px solid rgba(139,107,20,0.4)', borderRadius: '12px 12px 0 0', boxShadow: '0 -4px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', animation: 'slideUp 250ms ease-out' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(139,107,20,0.3)', borderRadius: 2, margin: '10px auto' }} />

        {/* Header */}
        <div style={{ padding: '0 1.25rem 0.75rem', textAlign: 'center', flexShrink: 0 }}>
          {numberStack.length > 0 && (
            <button onClick={navigateBack} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B5E10', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}>&larr; Back to {numberStack[numberStack.length - 1]}</button>
          )}
          {/* Language label */}
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.6)', display: 'block', marginBottom: 4 }}>
            {currentNumber.startsWith('G') ? 'Greek' : 'Hebrew'}
          </span>
          {/* Original word */}
          {entry?.original_word && <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: '#1A0A04', display: 'block', marginBottom: 6 }}>{entry.original_word}</span>}
          {/* Transliteration + Pronunciation side by side */}
          {(entry?.transliteration || entry?.pronunciation) && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: 6 }}>
              {entry.transliteration && (
                <div>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.5)', display: 'block', marginBottom: 2 }}>Transliteration</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, color: '#8B5E10' }}>{entry.transliteration}</span>
                </div>
              )}
              {entry.pronunciation && (
                <div>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.5)', display: 'block', marginBottom: 2 }}>Pronunciation</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 13, color: '#8B5E10' }}>({entry.pronunciation})</span>
                </div>
              )}
            </div>
          )}
          {/* Strong's number */}
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '3px', color: 'rgba(139,107,20,0.8)', display: 'block' }}>{currentNumber}</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(139,107,20,0.2)', flexShrink: 0, padding: '0 1.25rem', overflowX: 'auto' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: tab === t.id ? '#2C1810' : '#8B6914', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', borderBottom: tab === t.id ? '2px solid #8B6914' : '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' }}>{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>

          {/* ── TAB 1: KJV CONCORDANCE ── */}
          {tab === 'kjv' && entry && (
            <>
              {/* Webster's 1828 Definition */}
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B5E10', marginBottom: 6 }}>Webster&apos;s 1828 Definition</p>
                {entry.webster ? (
                  <>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#8B5E10', marginBottom: 2 }}>{entry.webster.word}</p>
                    {entry.webster.part_of_speech && <p style={{ fontFamily: 'var(--font-ui)', fontStyle: 'italic', fontSize: 10, color: '#8B5E10', marginBottom: 2 }}>{entry.webster.part_of_speech}</p>}
                    {entry.webster.etymology && <p style={{ fontFamily: 'var(--font-ui)', fontStyle: 'italic', fontSize: 10, color: '#8B5E10', marginBottom: 6 }}>{entry.webster.etymology}</p>}
                    <p style={{ fontFamily: 'var(--font-reading)', fontSize: 17, color: '#1A0A04', lineHeight: 1.9 }}>{entry.webster.definition}</p>
                  </>
                ) : (
                  <p style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: 14, color: '#8B5E10', opacity: 0.6 }}>Not found in Webster&apos;s 1828</p>
                )}
              </div>

              {/* Verse list removed — lives in Tab 2 and Tab 3 */}
            </>
          )}

          {/* ── TAB 2: STRONG'S CONCORDANCE ── */}
          {tab === 'strongs' && entry && (
            <>
              {/* Strong's exhaustive entry — header info shown above tabs */}
              {entry.part_of_speech && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B5E10', marginBottom: 4 }}>Part of Speech</p>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#1A0A04', lineHeight: 1.6 }}>{renderWithStrongsLinks(entry.part_of_speech)}</p>
                </div>
              )}
              {(entry.strongs_def || entry.definition) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B5E10', marginBottom: 4 }}>Definition</p>
                  <p style={{ fontFamily: 'var(--font-reading)', fontSize: 17, color: '#1A0A04', lineHeight: 1.9 }}>{entry.strongs_def || entry.definition}</p>
                </div>
              )}
              {entry.derivation && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B5E10', marginBottom: 4 }}>Derivation</p>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#1A0A04', lineHeight: 1.6 }}>{renderWithStrongsLinks(entry.derivation)}</p>
                </div>
              )}
              {entry.outline_of_biblical_usage && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B5E10', marginBottom: 4 }}>Outline of Biblical Usage</p>
                  <div style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: '#1A0A04', lineHeight: 1.8 }}>
                    {entry.outline_of_biblical_usage.split('\n').map((line, i) => (
                      <p key={i} style={{ marginBottom: 4 }}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
              {/* KJV Translations — prefer computed all_kjv_translations */}
              {(entry.all_kjv_translations || entry.kjv_usage) && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B5E10', marginBottom: 4 }}>KJV Translations</p>
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#5C3D11', lineHeight: 1.8 }}>{entry.all_kjv_translations || entry.kjv_usage}</p>
                </div>
              )}
              {/* Occurrence counts */}
              {(entry.total_nt_occurrences || entry.total_ot_occurrences) ? (
                <div style={{ marginBottom: '0.75rem' }}>
                  {entry.total_nt_occurrences ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontStyle: 'italic', color: '#8B5E10' }}>Used {entry.total_nt_occurrences} times in the New Testament</p> : null}
                  {entry.total_ot_occurrences ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontStyle: 'italic', color: '#8B5E10' }}>Used {entry.total_ot_occurrences} times in the Old Testament</p> : null}
                </div>
              ) : null}
              {/* Root words from derivation or root_words field */}
              {(() => {
                const refs = new Set<string>()
                if (entry.part_of_speech) (entry.part_of_speech.match(/[GH]\d+/g) ?? []).forEach(r => refs.add(r))
                if (entry.derivation) (entry.derivation.match(/[GH]\d+/g) ?? []).forEach(r => refs.add(r))
                if (entry.root_words) {
                  try { const arr = JSON.parse(entry.root_words); if (Array.isArray(arr)) arr.forEach((r: string) => { if (/^[GH]\d+$/.test(r)) refs.add(r) }) } catch {}
                }
                if (refs.size === 0) return null
                return (
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#8B5E10', marginBottom: 4 }}>Root Words</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Array.from(refs).map((num, i) => (
                        <button key={i} onClick={() => navigateToRoot(num)} style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: '#8B5E10', background: 'rgba(139,107,20,0.08)', border: '1px solid rgba(139,107,20,0.25)', borderRadius: 3, padding: '4px 10px', cursor: 'pointer', letterSpacing: '1px' }}>{num}</button>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Every verse in Bible with this Strong's number */}
              <div style={{ borderTop: '1px solid rgba(139,107,20,0.2)', paddingTop: '1rem' }}>
                {renderResults(strongsResults, strongsTotal, loadingStrongs, currentWord, `Used ${strongsTotal} times in the Bible`)}
              </div>
            </>
          )}

          {/* ── TAB 3: ENGLISH CONCORDANCE ── */}
          {tab === 'english' && (
            renderResults(englishResults, englishTotal, loadingEnglish, currentWord, `Every use of '${currentWord}' in the ${testamentLabel}`)
          )}
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
