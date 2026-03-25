'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'

/* ── Type definitions ── */

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
}

interface NamesResult {
  name: string
  hitchcock: {
    name: string; meaning: string; language_origin: string | null
    gender: string | null; scripture_refs: string[] | null
    strongs_number: string | null; notes: string | null
  } | null
  smiths: {
    topic: string; definition: string; scripture_refs: string[] | null
    strongs_numbers: string[] | null; see_also: string[] | null; entry_type: string | null
  } | null
  gesenius: {
    strongs_number: string; hebrew_word: string | null; transliteration: string | null
    definition: string; extended_definition: string
    root: string | null; cognates: string | null; scripture_refs: string[] | null
  } | null
  strongs: {
    strongs_number: string; original_word: string; transliteration: string | null
    pronunciation: string | null; definition: string | null
    part_of_speech: string | null; kjv_usage: string | null
  } | null
  naves: {
    topic: string; subtopic: string | null; content: string
    scripture_refs: string[] | null; see_also: string[] | null
    strongs_numbers: string[] | null
  }[]
}

interface ConcordanceResult {
  book: string; chapter: number; verse: number; kjv_text: string
}

interface ResourcesPanelProps {
  word: string
  strongsNumber?: string | null
  isName?: boolean
  onClose: () => void
}

type TabDef = { id: string; label: string }

export default function ResourcesPanel({ word, strongsNumber, isName, onClose }: ResourcesPanelProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const m = theme === 'modern'
  const panelBg = m ? '#FFFFFF' : '#F8F2E2'
  const textMain = m ? '#1A1A1A' : '#1A0A04'
  const labelColor = m ? '#888888' : '#8B5E10'
  const accentColor = m ? '#0F3460' : '#C8960A'
  const tabActive = m ? '#0F3460' : '#8B5E10'
  const highlightBg = m ? '#FFF3CD' : 'transparent'
  const highlightColor = m ? '#0F3460' : '#C8960A'

  // Data from APIs
  const [strongsEntry, setStrongsEntry] = useState<StrongsEntry | null>(null)
  const [namesData, setNamesData] = useState<NamesResult | null>(null)
  const [loading, setLoading] = useState(true)

  // Strong's root navigation stack
  const [currentNumber, setCurrentNumber] = useState(strongsNumber ?? null)
  const [numberStack, setNumberStack] = useState<string[]>([])

  // Concordance (lazy loaded)
  const [strongsResults, setStrongsResults] = useState<ConcordanceResult[]>([])
  const [strongsTotal, setStrongsTotal] = useState(0)
  const [loadingStrongs, setLoadingStrongs] = useState(false)
  const [strongsFetched, setStrongsFetched] = useState(false)

  const [englishResults, setEnglishResults] = useState<ConcordanceResult[]>([])
  const [englishTotal, setEnglishTotal] = useState(0)
  const [loadingEnglish, setLoadingEnglish] = useState(false)
  const [englishFetched, setEnglishFetched] = useState(false)

  // Active tab
  const [activeTab, setActiveTab] = useState<string>('')

  // Fetch both APIs in parallel on mount
  useEffect(() => {
    setLoading(true)
    setStrongsEntry(null)
    setNamesData(null)
    setStrongsFetched(false)
    setEnglishFetched(false)

    const promises: Promise<void>[] = []

    // Strong's API
    if (currentNumber) {
      promises.push(
        fetch(`/api/strongs/${encodeURIComponent(currentNumber)}?word=${encodeURIComponent(word)}`)
          .then(r => r.json())
          .then(data => { if (data.strongs_number) setStrongsEntry(data) })
          .catch(() => {})
      )
    }

    // Names API — always try for proper nouns, also try for any word (may have Nave's match)
    const cleanWord = word.replace(/[^a-zA-Z'-]/g, '')
    if (cleanWord.length >= 2) {
      promises.push(
        fetch(`/api/names/${encodeURIComponent(cleanWord)}`)
          .then(r => { if (!r.ok) return null; return r.json() })
          .then(data => { if (data) setNamesData(data) })
          .catch(() => {})
      )
    }

    Promise.all(promises).then(() => setLoading(false))
  }, [currentNumber, word])

  // Set default active tab once data loads
  useEffect(() => {
    if (loading) return
    const tabs = buildTabs()
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, strongsEntry, namesData])

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Lazy load Strong's concordance
  useEffect(() => {
    if (activeTab !== 'strongs' || strongsFetched || !currentNumber) return
    setLoadingStrongs(true)
    fetch('/api/strongs/concordance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strongsNumber: currentNumber, page: 0, limit: 100 }),
    })
      .then(r => r.json())
      .then(data => { setStrongsResults(data.results ?? []); setStrongsTotal(data.total ?? 0); setStrongsFetched(true); setLoadingStrongs(false) })
      .catch(() => setLoadingStrongs(false))
  }, [activeTab, currentNumber, strongsFetched])

  // Lazy load English concordance
  useEffect(() => {
    if (activeTab !== 'concordance' || englishFetched || !strongsEntry) return
    setLoadingEnglish(true)
    fetch('/api/strongs/concordance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ englishWord: word, testament: strongsEntry.testament, page: 0, limit: 100 }),
    })
      .then(r => r.json())
      .then(data => { setEnglishResults(data.results ?? []); setEnglishTotal(data.total ?? 0); setEnglishFetched(true); setLoadingEnglish(false) })
      .catch(() => setLoadingEnglish(false))
  }, [activeTab, word, strongsEntry, englishFetched])

  /* ── Navigation helpers ── */

  function navigateToRoot(num: string) {
    if (currentNumber) setNumberStack(prev => [...prev, currentNumber!])
    setCurrentNumber(num)
    setActiveTab('strongs')
    setStrongsFetched(false); setEnglishFetched(false)
  }

  function navigateBack() {
    const prev = numberStack[numberStack.length - 1]
    if (prev) {
      setNumberStack(s => s.slice(0, -1))
      setCurrentNumber(prev)
      setStrongsFetched(false); setEnglishFetched(false)
    }
  }

  const navigateTo = useCallback((book: string, chapter: number) => {
    onClose()
    router.push(`/bible/${encodeURIComponent(book)}/${chapter}`)
  }, [onClose, router])

  /* ── Rendering helpers ── */

  function renderWithStrongsLinks(text: string) {
    const parts = text.split(/([GH]\d+)/g)
    return parts.map((part, i) =>
      /^[GH]\d+$/.test(part) ? (
        <span key={i} onClick={() => navigateToRoot(part)} style={{ color: labelColor, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px' }}>{part}</span>
      ) : part
    )
  }

  function highlightWord(text: string, w: string) {
    const clean = text.replace(/\s*\{[^}]*\}\s*/g, ' ').trim()
    const escaped = w.replace(/[^a-zA-Z'-]/g, '')
    if (!escaped) return clean
    const regex = new RegExp(`(\\b${escaped}\\b)`, 'gi')
    const parts = clean.split(regex)
    return parts.map((p, i) =>
      regex.test(p) ? <span key={i} style={{ color: highlightColor, fontWeight: 600, background: highlightBg, padding: highlightBg !== 'transparent' ? '0 2px' : 0, borderRadius: 2 }}>{p}</span> : p
    )
  }

  function renderConcordanceResults(results: ConcordanceResult[], total: number, isLoading: boolean, w: string, header?: string) {
    if (isLoading) return <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>Loading concordance...</p>
    if (results.length === 0) return <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>No occurrences found.</p>
    return (
      <>
        {header && <p style={{ fontFamily: 'var(--font-ui)', fontStyle: 'italic', fontSize: 10, color: labelColor, marginBottom: '0.5rem' }}>{header}</p>}
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, letterSpacing: '1px', marginBottom: '1rem' }}>
          {total} occurrence{total !== 1 ? 's' : ''}{total > 100 ? ' (showing first 100)' : ''}
        </p>
        <div style={{ maxHeight: 'calc(60vh - 240px)', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>
          {results.map((r, i) => (
            <button key={`${r.book}-${r.chapter}-${r.verse}-${i}`} onClick={() => navigateTo(r.book, r.chapter)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 0', background: 'none', border: 'none', borderBottom: '0.5px solid rgba(139,107,20,0.15)', cursor: 'pointer' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: labelColor, letterSpacing: '2px' }}>{r.book} {r.chapter}:{r.verse}</span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: textMain, lineHeight: 1.6, marginTop: 2 }}>{highlightWord(r.kjv_text, w)}</p>
            </button>
          ))}
        </div>
      </>
    )
  }

  /* ── Build dynamic tabs ── */

  function buildTabs(): TabDef[] {
    const tabs: TabDef[] = []
    if (strongsEntry?.webster) tabs.push({ id: 'webster', label: "Webster's 1828" })
    if (strongsEntry) tabs.push({ id: 'strongs', label: "Strong's" })
    if (namesData?.hitchcock) tabs.push({ id: 'hitchcock', label: "Hitchcock's" })
    if (namesData?.smiths) tabs.push({ id: 'smiths', label: "Smith's" })
    // Gesenius: show if from names API (name etymology) or from Strong's API (H-number)
    const gesenius = namesData?.gesenius || strongsEntry?.gesenius
    if (gesenius) tabs.push({ id: 'gesenius', label: "Gesenius" })
    if (namesData?.naves && namesData.naves.length > 0) tabs.push({ id: 'naves', label: "Nave's" })
    if (strongsEntry) tabs.push({ id: 'concordance', label: 'Concordance' })
    return tabs
  }

  const tabs = buildTabs()
  const testamentLabel = strongsEntry?.testament === 'OT' ? 'Old Testament' : 'New Testament'

  // Gesenius data — prefer Strong's API (more detailed for word lookups), fallback to names API
  const geseniusData = strongsEntry?.gesenius || namesData?.gesenius

  /* ── Determine header content ── */
  const showOriginalWord = strongsEntry?.original_word
  const hitchcockMeaning = namesData?.hitchcock?.meaning
  const headerLabel = isName ? 'Biblical Name' : (currentNumber?.startsWith('G') ? 'Greek' : currentNumber?.startsWith('H') ? 'Hebrew' : null)

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '65vh', zIndex: 56, background: panelBg, borderTop: '2px solid rgba(139,107,20,0.4)', borderRadius: '12px 12px 0 0', boxShadow: '0 -4px 30px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', animation: 'resourcesSlideUp 250ms ease-out' }}>
        <div style={{ width: 36, height: 4, background: 'rgba(139,107,20,0.3)', borderRadius: 2, margin: '10px auto' }} />

        {/* Header */}
        <div style={{ padding: '0 1.25rem 0.75rem', textAlign: 'center', flexShrink: 0 }}>
          {numberStack.length > 0 && (
            <button onClick={navigateBack} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}>&larr; Back to {numberStack[numberStack.length - 1]}</button>
          )}
          {/* Panel title */}
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.6)', display: 'block', marginBottom: 4 }}>
            {headerLabel ? `Resources \u00B7 ${headerLabel}` : 'Resources'}
          </span>
          {/* Original word (from Strong's) */}
          {showOriginalWord && (
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, color: textMain, display: 'block', marginBottom: 4 }}>{showOriginalWord}</span>
          )}
          {/* Transliteration + Pronunciation */}
          {strongsEntry && (strongsEntry.transliteration || strongsEntry.pronunciation) && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: 6 }}>
              {strongsEntry.transliteration && (
                <div>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.5)', display: 'block', marginBottom: 2 }}>Transliteration</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 17, color: accentColor }}>{strongsEntry.transliteration}</span>
                </div>
              )}
              {strongsEntry.pronunciation && (
                <div>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.5)', display: 'block', marginBottom: 2 }}>Pronunciation</span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 17, color: accentColor }}>({strongsEntry.pronunciation})</span>
                </div>
              )}
            </div>
          )}
          {/* Word / Name */}
          {!showOriginalWord && (
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: textMain, display: 'block', marginBottom: 4 }}>{word}</span>
          )}
          {showOriginalWord && currentNumber && (
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '3px', color: 'rgba(139,107,20,0.8)', display: 'block' }}>{currentNumber}</span>
          )}
          {/* Hitchcock meaning */}
          {hitchcockMeaning && (
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 16, color: accentColor, display: 'block', marginTop: 2 }}>
              &ldquo;{hitchcockMeaning}&rdquo;
            </span>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
            Looking up resources...
          </p>
        )}

        {/* No results */}
        {!loading && tabs.length === 0 && (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: labelColor, textAlign: 'center', padding: '2rem 0' }}>
            No resources found for &ldquo;{word}&rdquo;
          </p>
        )}

        {/* Tabs */}
        {!loading && tabs.length > 0 && (
          <>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(139,107,20,0.2)', flexShrink: 0, padding: '0 1.25rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: activeTab === t.id ? textMain : labelColor, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', borderBottom: activeTab === t.id ? `2px solid ${tabActive}` : '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' }}>{t.label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>

              {/* ── WEBSTER'S 1828 ── */}
              {activeTab === 'webster' && strongsEntry?.webster && (
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: labelColor, marginBottom: 2 }}>{strongsEntry.webster.word}</p>
                  {strongsEntry.webster.part_of_speech && <p style={{ fontFamily: 'var(--font-ui)', fontStyle: 'italic', fontSize: 10, color: labelColor, marginBottom: 2 }}>{strongsEntry.webster.part_of_speech}</p>}
                  {strongsEntry.webster.etymology && <p style={{ fontFamily: 'var(--font-ui)', fontStyle: 'italic', fontSize: 10, color: labelColor, marginBottom: 6 }}>{strongsEntry.webster.etymology}</p>}
                  <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.9 }}>{strongsEntry.webster.definition}</p>
                </div>
              )}

              {/* ── STRONG'S CONCORDANCE ── */}
              {activeTab === 'strongs' && strongsEntry && (
                <>
                  {strongsEntry.part_of_speech && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>Part of Speech</p>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: textMain, lineHeight: 1.6 }}>{renderWithStrongsLinks(strongsEntry.part_of_speech)}</p>
                    </div>
                  )}
                  {(strongsEntry.strongs_def || strongsEntry.definition) && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>Definition</p>
                      <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.9 }}>{strongsEntry.strongs_def || strongsEntry.definition}</p>
                    </div>
                  )}
                  {strongsEntry.derivation && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>Derivation</p>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: textMain, lineHeight: 1.6 }}>{renderWithStrongsLinks(strongsEntry.derivation)}</p>
                    </div>
                  )}
                  {strongsEntry.outline_of_biblical_usage && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>Outline of Biblical Usage</p>
                      <div style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8 }}>
                        {strongsEntry.outline_of_biblical_usage.split('\n').map((line, i) => (
                          <p key={i} style={{ marginBottom: 4 }}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {(strongsEntry.all_kjv_translations || strongsEntry.kjv_usage) && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>KJV Translations</p>
                      <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#5C3D11', lineHeight: 1.8 }}>{strongsEntry.all_kjv_translations || strongsEntry.kjv_usage}</p>
                    </div>
                  )}
                  {(strongsEntry.total_nt_occurrences || strongsEntry.total_ot_occurrences) ? (
                    <div style={{ marginBottom: '0.75rem' }}>
                      {strongsEntry.total_nt_occurrences ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontStyle: 'italic', color: labelColor }}>Used {strongsEntry.total_nt_occurrences} times in the New Testament</p> : null}
                      {strongsEntry.total_ot_occurrences ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontStyle: 'italic', color: labelColor }}>Used {strongsEntry.total_ot_occurrences} times in the Old Testament</p> : null}
                    </div>
                  ) : null}
                  {/* Root words */}
                  {(() => {
                    const refs = new Set<string>()
                    if (strongsEntry.part_of_speech) (strongsEntry.part_of_speech.match(/[GH]\d+/g) ?? []).forEach(r => refs.add(r))
                    if (strongsEntry.derivation) (strongsEntry.derivation.match(/[GH]\d+/g) ?? []).forEach(r => refs.add(r))
                    if (strongsEntry.root_words) {
                      try { const arr = JSON.parse(strongsEntry.root_words); if (Array.isArray(arr)) arr.forEach((r: string) => { if (/^[GH]\d+$/.test(r)) refs.add(r) }) } catch {}
                    }
                    if (refs.size === 0) return null
                    return (
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>Root Words</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {Array.from(refs).map((num, i) => (
                            <button key={i} onClick={() => navigateToRoot(num)} style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: labelColor, background: 'rgba(139,107,20,0.08)', border: '1px solid rgba(139,107,20,0.25)', borderRadius: 3, padding: '4px 10px', cursor: 'pointer', letterSpacing: '1px' }}>{num}</button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                  {/* Concordance within Strong's tab */}
                  <div style={{ borderTop: '1px solid rgba(139,107,20,0.2)', paddingTop: '1rem' }}>
                    {renderConcordanceResults(strongsResults, strongsTotal, loadingStrongs, word, `Used ${strongsTotal} times in the Bible`)}
                  </div>
                </>
              )}

              {/* ── HITCHCOCK'S ── */}
              {activeTab === 'hitchcock' && namesData?.hitchcock && (
                <div>
                  <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8, marginBottom: 6 }}>
                    <strong>{namesData.hitchcock.name}</strong> — {namesData.hitchcock.meaning}
                  </p>
                  {namesData.hitchcock.language_origin && (
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: labelColor }}>
                      Origin: {namesData.hitchcock.language_origin}
                    </p>
                  )}
                  {namesData.hitchcock.strongs_number && !currentNumber && (
                    <button
                      onClick={() => navigateToRoot(namesData.hitchcock!.strongs_number!)}
                      style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: accentColor, background: 'rgba(139,107,20,0.08)', border: '1px solid rgba(139,107,20,0.25)', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', marginTop: 8 }}
                    >
                      Strong&apos;s {namesData.hitchcock.strongs_number}
                    </button>
                  )}
                  {namesData.hitchcock.scripture_refs && namesData.hitchcock.scripture_refs.length > 0 && (
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, marginTop: 6 }}>
                      Scripture: {namesData.hitchcock.scripture_refs.join(', ')}
                    </p>
                  )}
                  {namesData.hitchcock.notes && (
                    <p style={{ fontFamily: 'var(--font-reading)', fontSize: 13, color: textMain, lineHeight: 1.7, marginTop: 8, opacity: 0.85 }}>
                      {namesData.hitchcock.notes}
                    </p>
                  )}
                </div>
              )}

              {/* ── SMITH'S ── */}
              {activeTab === 'smiths' && namesData?.smiths && (
                <div>
                  {namesData.smiths.entry_type && (
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(139,107,20,0.6)', display: 'inline-block', marginBottom: 6, background: 'rgba(139,107,20,0.06)', padding: '2px 6px', borderRadius: 2 }}>
                      {namesData.smiths.entry_type}
                    </span>
                  )}
                  <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8 }}>
                    {namesData.smiths.definition.length > 800
                      ? namesData.smiths.definition.slice(0, 800) + '...'
                      : namesData.smiths.definition}
                  </p>
                  {namesData.smiths.see_also && namesData.smiths.see_also.length > 0 && (
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, marginTop: 6 }}>
                      See also: {namesData.smiths.see_also.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* ── GESENIUS ── */}
              {activeTab === 'gesenius' && geseniusData && (
                <div>
                  {geseniusData.hebrew_word && (
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, color: textMain, marginBottom: 4 }}>
                      {geseniusData.hebrew_word}
                    </p>
                  )}
                  {geseniusData.transliteration && (
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 15, color: accentColor, marginBottom: 8 }}>
                      {geseniusData.transliteration}
                    </p>
                  )}
                  <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8, marginBottom: 6 }}>
                    {geseniusData.definition}
                  </p>
                  {geseniusData.extended_definition && geseniusData.extended_definition !== geseniusData.definition && (
                    <p style={{ fontFamily: 'var(--font-reading)', fontSize: 14, color: textMain, lineHeight: 1.8, opacity: 0.85 }}>
                      {geseniusData.extended_definition.length > 500
                        ? geseniusData.extended_definition.slice(0, 500) + '...'
                        : geseniusData.extended_definition}
                    </p>
                  )}
                  {geseniusData.root && (
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: labelColor, marginTop: 6 }}>Root: {geseniusData.root}</p>
                  )}
                  {geseniusData.cognates && (
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: labelColor, marginTop: 2 }}>Cognates: {geseniusData.cognates}</p>
                  )}
                </div>
              )}

              {/* ── NAVE'S TOPICAL ── */}
              {activeTab === 'naves' && namesData?.naves && namesData.naves.length > 0 && (
                <div>
                  {namesData.naves.map((entry, i) => (
                    <div key={i} style={{ marginBottom: '1.25rem' }}>
                      {entry.subtopic && (
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600, color: accentColor, marginBottom: 4 }}>{entry.subtopic}</p>
                      )}
                      <p style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: textMain, lineHeight: 1.8 }}>
                        {entry.content.length > 600
                          ? entry.content.slice(0, 600) + '...'
                          : entry.content}
                      </p>
                      {entry.scripture_refs && entry.scripture_refs.length > 0 && (
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, marginTop: 4 }}>
                          Scripture: {entry.scripture_refs.slice(0, 10).join(', ')}{entry.scripture_refs.length > 10 ? ` +${entry.scripture_refs.length - 10} more` : ''}
                        </p>
                      )}
                      {entry.see_also && entry.see_also.length > 0 && (
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: labelColor, marginTop: 2 }}>
                          See also: {entry.see_also.join(', ')}
                        </p>
                      )}
                      {i < namesData.naves.length - 1 && (
                        <div style={{ height: 1, background: 'rgba(139,107,20,0.15)', margin: '1rem 0' }} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── ENGLISH CONCORDANCE ── */}
              {activeTab === 'concordance' && (
                renderConcordanceResults(englishResults, englishTotal, loadingEnglish, word, `Every use of '${word}' in the ${testamentLabel}`)
              )}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes resourcesSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
