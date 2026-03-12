'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage, BPS_LANGUAGES } from '@/context/LanguageContext'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import StrongsModal from '@/components/StrongsModal'

interface Verse {
  verse: number
  kjv_text: string
  twi_text: string | null
  has_twi: boolean
}

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

// Strip manuscript/translation notes in curly braces from KJV text
// e.g. "{was}", "{firmament: Heb. expansion}", "{And the evening...: Heb. ...}"
function cleanKjvText(text: string): string {
  return text.replace(/\s*\{[^}]*\}\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

export default function VerseDisplay({
  verses,
  chapterHasTwi,
  bookName,
  chapter,
}: {
  verses: Verse[]
  chapterHasTwi: boolean
  bookName: string
  chapter: number
}) {
  const { languageCode, languageName, setLanguage } = useLanguage()

  const [showCompanion, setShowCompanion] = useState(
    languageCode === 'twi' ? chapterHasTwi : true
  )
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [strongsEnabled, setStrongsEnabled] = useState(true)
  const [verseWords, setVerseWords] = useState<Record<number, StrongsWord[]>>({})
  const [loadingStrongs, setLoadingStrongs] = useState(false)
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null)

  function handleSelectLang(code: string, active: boolean) {
    if (!active) return
    setLanguage(code)
    setShowCompanion(true)
    setDropdownOpen(false)
  }

  // Fetch Strong's data when enabled
  useEffect(() => {
    if (!strongsEnabled || !bookName || !chapter) return
    if (Object.keys(verseWords).length > 0) return // already loaded

    let cancelled = false
    setLoadingStrongs(true)

    async function fetchWords() {
      const supabase = createSupabaseBrowser()
      const results: Record<number, StrongsWord[]> = {}

      // Single query: fetch all words for this chapter with Strong's data joined
      const { data, error } = await supabase
        .from('verse_words')
        .select('verse, word_position, word_text, strongs_number')
        .eq('book', bookName)
        .eq('chapter', chapter)
        .order('verse')
        .order('word_position')
        .limit(10000)

      if (cancelled || error || !data || data.length === 0) {
        if (!cancelled) setLoadingStrongs(false)
        return
      }

      // Collect unique Strong's numbers to look up
      const strongsNums = Array.from(new Set(
        data.filter(r => r.strongs_number).map(r => r.strongs_number as string)
      ))

      // Fetch Strong's entries for those numbers
      const { data: strongsData } = strongsNums.length > 0
        ? await supabase
            .from('strongs_entries')
            .select('strongs_number, testament, original_word, transliteration, pronunciation, part_of_speech, definition, kjv_usage')
            .in('strongs_number', strongsNums)
        : { data: [] }

      interface StrongsEntry {
        strongs_number: string
        testament: string
        original_word: string
        transliteration: string | null
        pronunciation: string | null
        part_of_speech: string | null
        definition: string | null
        kjv_usage: string | null
      }
      const lookup: Record<string, StrongsEntry> = {}
      if (strongsData) {
        for (const se of strongsData as StrongsEntry[]) {
          lookup[se.strongs_number] = se
        }
      }

      // Group by verse
      for (const row of data) {
        if (!results[row.verse]) results[row.verse] = []
        const se = row.strongs_number ? lookup[row.strongs_number] : null
        results[row.verse].push({
          word_position: row.word_position,
          word_text: row.word_text,
          strongs_number: row.strongs_number,
          testament: se?.testament ?? null,
          original_word: se?.original_word ?? null,
          transliteration: se?.transliteration ?? null,
          pronunciation: se?.pronunciation ?? null,
          part_of_speech: se?.part_of_speech ?? null,
          definition: se?.definition ?? null,
          kjv_usage: se?.kjv_usage ?? null,
        })
      }

      if (!cancelled) {
        setVerseWords(results)
        setLoadingStrongs(false)
      }
    }

    fetchWords()
    return () => { cancelled = true }
  }, [strongsEnabled, bookName, chapter, verseWords])

  const handleWordClick = useCallback((word: StrongsWord, verseNum: number) => {
    if (!word.strongs_number) return
    setSelectedWord({ ...word, verseNum, bookName, chapter })
  }, [bookName, chapter])

  function renderStrongsVerse(v: Verse) {
    const words = verseWords[v.verse]
    if (!words || words.length === 0) {
      return <>{cleanKjvText(v.kjv_text)}</>
    }

    // Filter out curly-brace annotation words and clean remaining word text
    const cleanedWords = words
      .map(w => ({ ...w, word_text: w.word_text.replace(/\{[^}]*\}?/g, '').trim() }))
      .filter(w => w.word_text.length > 0)

    let wordIndex = 0
    return (
      <>
        {cleanedWords.map((w) => {
          wordIndex++
          return (
            <span key={w.word_position}>
              {wordIndex > 1 && ' '}
              {w.strongs_number ? (
                <span
                  onClick={() => handleWordClick(w, v.verse)}
                  className="cursor-pointer text-[#2563eb] hover:text-[#1d4ed8] underline decoration-[#2563eb]/30 hover:decoration-[#1d4ed8]/50 transition-colors rounded-sm px-0.5 -mx-0.5"
                >
                  {w.word_text}
                </span>
              ) : (
                w.word_text
              )}
            </span>
          )
        })}
      </>
    )
  }

  return (
    <>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b flex-wrap gap-3">
        <div className="hidden md:flex gap-8">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider" title="King James Version">
            English
          </p>
          {showCompanion && (
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {languageName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Strong's toggle */}
          <button
            onClick={() => setStrongsEnabled(!strongsEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              strongsEnabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <span className={`inline-block w-2 h-2 rounded-full ${strongsEnabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            Strong&apos;s: {strongsEnabled ? 'ON' : 'OFF'}
            {loadingStrongs && (
              <svg className="w-3 h-3 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </button>

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors"
            >
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Companion</span>
              <span className="font-semibold">{languageName}</span>
              <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 z-20 w-56 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                      Companion Translation
                    </p>
                    <p className="text-[10px] text-gray-400">
                      BPS-approved editions &middot; {BPS_LANGUAGES.length} languages
                    </p>
                  </div>
                  {BPS_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLang(lang.code, lang.active)}
                      disabled={!lang.active}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                        lang.active
                          ? lang.code === languageCode
                            ? 'bg-emerald-50 text-emerald-700 font-medium'
                            : 'hover:bg-gray-50 text-gray-700'
                          : 'text-gray-300 cursor-default'
                      }`}
                    >
                      <span>{lang.name}</span>
                      {lang.active && lang.code === languageCode && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                      {!lang.active && (
                        <span className="text-[10px] text-gray-300 italic">Coming soon</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Show/Hide toggle */}
          <button
            onClick={() => setShowCompanion(!showCompanion)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              showCompanion
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <span className={`inline-block w-2 h-2 rounded-full ${showCompanion ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {showCompanion ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Verses */}
      {verses.length > 0 ? (
        <div className="space-y-4 sm:space-y-2">
          {verses.map((v) => (
            <div
              key={v.verse}
              className="py-2 border-b border-gray-100"
            >
              {/* Desktop: side-by-side grid / Mobile: stacked */}
              <div className={showCompanion ? 'md:grid md:grid-cols-2 md:gap-8' : ''}>
                {/* English Column */}
                <p className="text-base sm:text-lg leading-relaxed">
                  <span className="font-semibold text-gray-400 mr-2 text-sm align-super">
                    {v.verse}
                  </span>
                  {strongsEnabled ? renderStrongsVerse(v) : cleanKjvText(v.kjv_text)}
                </p>

                {/* Companion Column — desktop */}
                {showCompanion && (
                  <p className="hidden md:block text-base sm:text-lg leading-relaxed">
                    {v.twi_text ? (
                      v.twi_text
                    ) : (
                      <span className="italic text-gray-400">
                        Translation coming
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Companion — mobile: stacked below with label and visual distinction */}
              {showCompanion && (
                <div className="md:hidden mt-2 ml-4 pl-3 border-l-2 border-emerald-200 bg-emerald-50/40 rounded-r-lg py-2 pr-3">
                  <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                    {languageName}
                  </span>
                  <p className="text-base leading-relaxed mt-0.5">
                    {v.twi_text ? (
                      v.twi_text
                    ) : (
                      <span className="italic text-gray-400">
                        Translation coming
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-red-500 py-8">
          No verses found. Check the data pipeline.
        </p>
      )}

      {/* Expanded Strong's Modal */}
      {selectedWord && (
        <StrongsModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </>
  )
}
