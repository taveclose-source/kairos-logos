'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

interface StrongsWord {
  word_position: number
  word_text: string
  strongs_number: string | null
  testament: string | null
  original_word: string | null
  transliteration: string | null
  pronunciation: string | null
  part_of_speech: string | null
  definition: string | null
  kjv_usage: string | null
}

interface SelectedWord extends StrongsWord {
  verseNum: number
  bookName: string
  chapter: number
}

interface ConcordanceEntry {
  book: string
  chapter: number
  verse: number
  testament: string
  sort_order: number
  preview: string
  english_word?: string
}

interface VerseData {
  book: string
  chapter: number
  verse: number
  testament: string
  kjv_text: string
  words: StrongsWord[]
}

interface StrongsModalProps {
  word: SelectedWord
  onClose: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

// ── Verse Modal (shows a single verse with blue-letter Strong's) ───────────

function VerseModal({
  entry,
  onClose,
  onWordClick,
}: {
  entry: ConcordanceEntry
  onClose: () => void
  onWordClick: (word: SelectedWord) => void
}) {
  const [verseData, setVerseData] = useState<VerseData | null>(null)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/api/concordance?type=verse&book=${encodeURIComponent(entry.book)}&chapter=${entry.chapter}&verse=${entry.verse}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setVerseData(data)
          setLoading(false)
        }
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [entry.book, entry.chapter, entry.verse])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function handleBlueWordClick(w: StrongsWord) {
    if (!w.strongs_number || !verseData) return
    onWordClick({
      ...w,
      verseNum: verseData.verse,
      bookName: verseData.book,
      chapter: verseData.chapter,
    })
  }

  const cleanedWords = verseData?.words
    ?.map(w => ({ ...w, word_text: w.word_text.replace(/\{[^}]*\}?/g, '').trim() }))
    .filter(w => w.word_text.length > 0)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={ref}
        className="relative z-[60] w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[70vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 rounded-t-2xl flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">
              {entry.book} {entry.chapter}:{entry.verse}
            </p>
            <p className="text-xs text-gray-400">Tap a blue word to view its Strong&apos;s entry</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 py-6">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading verse...
            </div>
          ) : verseData && cleanedWords ? (
            <p className="text-base sm:text-lg leading-relaxed">
              <span className="font-semibold text-gray-400 mr-2 text-sm align-super">{verseData.verse}</span>
              {cleanedWords.map((w, i) => (
                <span key={w.word_position}>
                  {i > 0 && ' '}
                  {w.strongs_number ? (
                    <span
                      onClick={() => handleBlueWordClick(w)}
                      className="cursor-pointer text-[#2563eb] hover:text-[#1d4ed8] underline decoration-[#2563eb]/30 hover:decoration-[#1d4ed8]/50 transition-colors rounded-sm px-0.5 -mx-0.5"
                    >
                      {w.word_text}
                    </span>
                  ) : (
                    w.word_text
                  )}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-gray-400 py-6">Verse data unavailable.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Concordance Section ────────────────────────────────────────────────────

function ConcordanceSection({
  heading,
  entries,
  testament,
  onEntryClick,
}: {
  heading: string
  entries: ConcordanceEntry[]
  testament: 'OT' | 'NT' | null
  onEntryClick: (entry: ConcordanceEntry) => void
}) {
  const [expanded, setExpanded] = useState(true)

  const filtered = testament ? entries.filter(e => e.testament === testament) : entries
  const otEntries = filtered.filter(e => e.testament === 'OT')
  const ntEntries = filtered.filter(e => e.testament === 'NT')

  if (filtered.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2"
      >
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          {heading}
          <span className="ml-2 text-gray-300">({filtered.length})</span>
        </p>
        <svg
          className={`w-4 h-4 text-gray-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-0.5">
          {/* OT group */}
          {otEntries.length > 0 && (
            <div>
              {ntEntries.length > 0 && (
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-2 mb-1 px-1">
                  Old Testament (Hebrew)
                </p>
              )}
              <EntryList entries={otEntries} onEntryClick={onEntryClick} />
            </div>
          )}

          {/* NT group */}
          {ntEntries.length > 0 && (
            <div>
              {otEntries.length > 0 && (
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-3 mb-1 px-1">
                  New Testament (Greek)
                </p>
              )}
              <EntryList entries={ntEntries} onEntryClick={onEntryClick} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EntryList({
  entries,
  onEntryClick,
}: {
  entries: ConcordanceEntry[]
  onEntryClick: (entry: ConcordanceEntry) => void
}) {
  const MAX_INITIAL = 20
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? entries : entries.slice(0, MAX_INITIAL)

  return (
    <>
      {visible.map((e, i) => (
        <button
          key={`${e.book}-${e.chapter}-${e.verse}-${i}`}
          onClick={() => onEntryClick(e)}
          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group flex items-baseline gap-2"
        >
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap group-hover:text-[#2563eb] transition-colors">
            {e.book} {e.chapter}:{e.verse}
          </span>
          <span className="text-sm text-gray-400 truncate leading-snug">
            &mdash; {e.preview}
          </span>
        </button>
      ))}
      {!showAll && entries.length > MAX_INITIAL && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-center text-xs text-[#2563eb] hover:text-[#1d4ed8] py-2 font-medium"
        >
          Show all {entries.length} occurrences
        </button>
      )}
    </>
  )
}

// ── Main Expanded Strong's Modal ───────────────────────────────────────────

type TabId = 'study' | 'concordance' | 'english'

const TABS: { id: TabId; label: string }[] = [
  { id: 'study', label: 'Word Study' },
  { id: 'concordance', label: 'Concordance' },
  { id: 'english', label: 'English' },
]

export default function StrongsModal({ word, onClose }: StrongsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('study')
  const [strongsConcordance, setStrongsConcordance] = useState<ConcordanceEntry[]>([])
  const [englishConcordance, setEnglishConcordance] = useState<ConcordanceEntry[]>([])
  const [loadingStrongs, setLoadingStrongs] = useState(false)
  const [loadingEnglish, setLoadingEnglish] = useState(false)
  const [activeVerseEntry, setActiveVerseEntry] = useState<ConcordanceEntry | null>(null)
  const [modalStack, setModalStack] = useState<SelectedWord[]>([word])
  const popupRef = useRef<HTMLDivElement>(null)

  const currentWord = modalStack[modalStack.length - 1]
  const testament = currentWord.testament === 'OT' ? 'OT' : 'NT'

  // Reset tab to Word Study when cascading to a new word
  useEffect(() => {
    setActiveTab('study')
  }, [modalStack.length])

  // Fetch Strong's concordance when word changes
  useEffect(() => {
    if (!currentWord.strongs_number) return
    let cancelled = false
    setLoadingStrongs(true)
    setStrongsConcordance([])

    fetch(`/api/concordance?type=strongs&number=${encodeURIComponent(currentWord.strongs_number)}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setStrongsConcordance(data.results ?? [])
          setLoadingStrongs(false)
        }
      })
      .catch(() => { if (!cancelled) setLoadingStrongs(false) })

    return () => { cancelled = true }
  }, [currentWord.strongs_number])

  // Fetch English concordance when word changes
  useEffect(() => {
    if (!currentWord.word_text) return
    let cancelled = false
    setLoadingEnglish(true)
    setEnglishConcordance([])

    const cleanWord = currentWord.word_text.replace(/[^a-zA-Z'-]/g, '')
    if (!cleanWord) { setLoadingEnglish(false); return }

    fetch(`/api/concordance?type=english&word=${encodeURIComponent(cleanWord)}&testament=${testament}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setEnglishConcordance(data.results ?? [])
          setLoadingEnglish(false)
        }
      })
      .catch(() => { if (!cancelled) setLoadingEnglish(false) })

    return () => { cancelled = true }
  }, [currentWord.word_text, testament])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        if (!activeVerseEntry) {
          onClose()
        }
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, activeVerseEntry])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (activeVerseEntry) {
          setActiveVerseEntry(null)
        } else if (modalStack.length > 1) {
          setModalStack(prev => prev.slice(0, -1))
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, activeVerseEntry, modalStack.length])

  const handleCascadeWord = useCallback((newWord: SelectedWord) => {
    setActiveVerseEntry(null)
    setModalStack(prev => [...prev, newWord])
  }, [])

  function handleBack() {
    if (modalStack.length > 1) {
      setModalStack(prev => prev.slice(0, -1))
    }
  }

  const langLabel = testament === 'OT' ? 'Hebrew' : 'Greek'

  return (
    <>
      {/* Main Strong's Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="fixed inset-0 bg-black/30" onClick={() => !activeVerseEntry && onClose()} />
        <div
          ref={popupRef}
          className="relative z-50 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-5 py-4 rounded-t-2xl flex items-start justify-between shrink-0">
            <div className="flex items-center gap-2">
              {modalStack.length > 1 && (
                <button
                  onClick={handleBack}
                  className="text-gray-400 hover:text-gray-600 p-1 -ml-1"
                  title="Back to previous word"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <p className="text-lg font-bold text-gray-900">{currentWord.word_text}</p>
                <p className="text-sm text-amber-600 font-mono font-medium">{currentWord.strongs_number}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 shrink-0 bg-white px-5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === tab.id
                    ? 'text-emerald-700'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-4">

            {/* ── Tab 1: Word Study ──────────────────────────────────────── */}
            {activeTab === 'study' && (
              <>
                {currentWord.original_word && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      {langLabel}
                    </p>
                    <p className="text-2xl font-serif text-gray-900">{currentWord.original_word}</p>
                  </div>
                )}

                <div className="flex gap-6">
                  {currentWord.transliteration && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Transliteration</p>
                      <p className="text-sm text-gray-700 italic">{currentWord.transliteration}</p>
                    </div>
                  )}
                  {currentWord.pronunciation && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Pronunciation</p>
                      <p className="text-sm text-gray-700">{currentWord.pronunciation}</p>
                    </div>
                  )}
                </div>

                {currentWord.part_of_speech && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Derivation</p>
                    <p className="text-sm text-gray-700">{currentWord.part_of_speech}</p>
                  </div>
                )}

                {currentWord.definition && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Definition</p>
                    <p className="text-sm text-gray-900 leading-relaxed">{currentWord.definition}</p>
                  </div>
                )}

                {currentWord.kjv_usage && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">KJV Usage</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{currentWord.kjv_usage}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    {currentWord.bookName} {currentWord.chapter}:{currentWord.verseNum}
                  </p>
                </div>

                <a
                  href={`/study?q=${encodeURIComponent(
                    `What is the significance of the ${langLabel} word "${currentWord.original_word}" (${currentWord.strongs_number}) used in ${currentWord.bookName} ${currentWord.chapter}:${currentWord.verseNum}?`
                  )}`}
                  className="block w-full text-center px-4 py-3 rounded-xl bg-amber-50 text-amber-700 font-medium text-sm border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  Ask the agent about this word
                </a>
              </>
            )}

            {/* ── Tab 2: Concordance (Strong's number) ───────────────────── */}
            {activeTab === 'concordance' && (
              <>
                {loadingStrongs ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm py-6">
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading concordance...
                  </div>
                ) : (
                  <ConcordanceSection
                    heading={`All occurrences of ${currentWord.original_word ?? currentWord.word_text} in Scripture`}
                    entries={strongsConcordance}
                    testament={null}
                    onEntryClick={setActiveVerseEntry}
                  />
                )}
              </>
            )}

            {/* ── Tab 3: English (testament-restricted) ──────────────────── */}
            {activeTab === 'english' && (
              <>
                {loadingEnglish ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm py-6">
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading English concordance...
                  </div>
                ) : (
                  <ConcordanceSection
                    heading={`All occurrences of '${currentWord.word_text}' in the ${testament === 'NT' ? 'New' : 'Old'} Testament`}
                    entries={englishConcordance}
                    testament={testament as 'OT' | 'NT'}
                    onEntryClick={setActiveVerseEntry}
                  />
                )}
              </>
            )}

          </div>
        </div>
      </div>

      {/* Verse Modal (overlay on top of Strong's modal) */}
      {activeVerseEntry && (
        <VerseModal
          entry={activeVerseEntry}
          onClose={() => setActiveVerseEntry(null)}
          onWordClick={handleCascadeWord}
        />
      )}
    </>
  )
}
