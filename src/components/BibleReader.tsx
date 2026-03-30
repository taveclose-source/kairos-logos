'use client'

import { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage, BPS_LANGUAGES } from '@/context/LanguageContext'
import PageTurn from '@/components/PageTurn'
// Sound effects removed — silent navigation
import type { PageTurnHandle } from '@/components/PageTurn'
import GlossaryModal from '@/components/GlossaryModal'
import type { GlossaryTerm } from '@/components/GlossaryModal'
import { usePinchFontSize, DEFAULT_SIZE } from '@/hooks/usePinchFontSize'
import ResourcesPanel from '@/components/ResourcesPanel'
import KingsPanel from '@/components/KingsPanel'
import VerseContextMenu from '@/components/VerseContextMenu'
import PastorResponsePanel from '@/components/PastorResponsePanel'
import TwiResourcesPanel from '@/components/TwiResourcesPanel'
import ChapterSheet from '@/components/ChapterSheet'
// Navigation handled by child sheets
import BookSheet from '@/components/BookSheet'
import { useTheme } from '@/contexts/ThemeContext'

interface Verse {
  verse: number
  kjv_text: string
  twi_text: string | null
  has_twi: boolean
}

interface WordData {
  word_position: number
  word_text: string
  strongs_number: string | null
}

interface StrongsEntry {
  original_word: string
  transliteration: string | null
  definition: string | null
  part_of_speech: string | null
  kjv_usage: string | null
}

interface BibleReaderProps {
  verses: Verse[]
  bookName: string
  chapter: number
  totalChapters: number
  prevHref: string | null
  nextHref: string | null
  verseWords?: Record<number, WordData[]>
  strongsLookup?: Record<string, StrongsEntry>
}

function cleanKjvText(text: string): string {
  return text.replace(/\s*\{[^}]*\}\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

export default function BibleReader({ verses, bookName, chapter, totalChapters, prevHref, nextHref, verseWords, strongsLookup }: BibleReaderProps) {
  const router = useRouter()
  const { languageName } = useLanguage()
  const { theme } = useTheme()
  const isModern = theme === 'modern'
  const parchmentBg = isModern ? '#FFFFFF' : 'var(--bg-warm)'
  const textColor = isModern ? '#1A1A1A' : '#1A0A04'
  const verseNumColor = isModern ? '#0F3460' : '#C8960A'
  // dropCapColor uses textColor directly
  // navColor/navHoverColor removed — header uses reference chip now
  const chapterHasTwiData = verses.some((v) => v.twi_text !== null)
  const progress = totalChapters > 0 ? (chapter / totalChapters) * 100 : 0
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([])
  const [selectedGlossary, setSelectedGlossary] = useState<GlossaryTerm | null>(null)
  const pageTurnRef = useRef<PageTurnHandle>(null)
  const { fontSize, setFontSize, onTouchStart: pinchStart, onTouchMove: pinchMove, onTouchEnd: pinchEnd } = usePinchFontSize()
  const [showSizeIndicator, setShowSizeIndicator] = useState(false)
  const [resourcesPanel, setResourcesPanel] = useState<{ word: string; strongsNumber?: string | null; isName?: boolean } | null>(null)
  const [twiPanel, setTwiPanel] = useState<{ word: string; verseReference: string; strongsNumber?: string; glossaryTerm?: string } | null>(null)
  const [kingsPanel, setKingsPanel] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ verse: { reference: string; text: string; book: string; chapter: number; verse_number: number }; twiText: string | null; position: { x: number; y: number } } | null>(null)
  const [pastorPanel, setPastorPanel] = useState<{ verse: { reference: string; text: string; book: string; chapter: number; verse_number: number }; context: { before: string[]; after: string[] } } | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)
  const [knownNames, setKnownNames] = useState<Set<string>>(new Set())
  const [twiWordClasses, setTwiWordClasses] = useState<Record<string, string>>({})
  const [chapterSheetOpen, setChapterSheetOpen] = useState(false)
  const [showStrongs, setShowStrongs] = useState(true)
  const [showCompanion, setShowCompanion] = useState(true)
  const chapterHasTwi = chapterHasTwiData && showCompanion
  const [chapterSheetBook, setChapterSheetBook] = useState(bookName)
  const [bookSheetOpen, setBookSheetOpen] = useState(false)
  const sizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Prefetch adjacent chapters for instant navigation
  useEffect(() => {
    if (nextHref) router.prefetch(nextHref)
    if (prevHref) router.prefetch(prevHref)
  }, [nextHref, prevHref, router])

  const goNext = useCallback(() => {
    if (nextHref) router.push(nextHref, { scroll: false })
  }, [nextHref, router])

  const goPrev = useCallback(() => {
    if (prevHref) router.push(prevHref, { scroll: false })
  }, [prevHref, router])

  const turnNext = useCallback(() => {
    if (nextHref && pageTurnRef.current) pageTurnRef.current.triggerTurn('forward')
  }, [nextHref])

  const turnPrev = useCallback(() => {
    if (prevHref && pageTurnRef.current) pageTurnRef.current.triggerTurn('back')
  }, [prevHref])

  // Keyboard navigation — trigger animation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') turnNext()
      if (e.key === 'ArrowLeft') turnPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [turnNext, turnPrev])

  // Active verse tracking for reference chip
  const [activeVerse, setActiveVerse] = useState(1)
  const [highlightVerse, setHighlightVerse] = useState<number | null>(null)

  // Scroll to verse from URL param (?verse=N)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const v = parseInt(params.get('verse') || '', 10)
    if (v && v >= 1) {
      setActiveVerse(v)
      setHighlightVerse(v)
      setTimeout(() => {
        const el = document.getElementById(`verse-${v}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
      setTimeout(() => setHighlightVerse(null), 2500)
    }
  }, [chapter])

  // Save last read position (both legacy key and new navigator key)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('logos_last_read', JSON.stringify({ book: bookName, chapter }))
      localStorage.setItem('logos_last_position', JSON.stringify({ book: bookName, chapter, verse: activeVerse }))
    }
  }, [bookName, chapter, activeVerse])

  // Keyboard font size: Ctrl+Plus, Ctrl+Minus, Ctrl+0
  useEffect(() => {
    function handleFontKey(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key === '=' || e.key === '+') { e.preventDefault(); setFontSize(fontSize + 1) }
      if (e.key === '-') { e.preventDefault(); setFontSize(fontSize - 1) }
      if (e.key === '0') { e.preventDefault(); setFontSize(DEFAULT_SIZE) }
    }
    window.addEventListener('keydown', handleFontKey)
    return () => window.removeEventListener('keydown', handleFontKey)
  }, [fontSize, setFontSize])

  // Show font size indicator on change
  useEffect(() => {
    if (fontSize === DEFAULT_SIZE) return
    setShowSizeIndicator(true)
    if (sizeTimerRef.current) clearTimeout(sizeTimerRef.current)
    sizeTimerRef.current = setTimeout(() => setShowSizeIndicator(false), 1500)
  }, [fontSize])

  // Pinch handlers now integrated into handleReaderTouchStart/Move/End

  // Fetch glossary terms once
  useEffect(() => {
    let cancelled = false
    fetch('/api/glossary')
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data) => { if (!cancelled && Array.isArray(data)) setGlossaryTerms(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Fetch Hitchcock's names for proper noun detection
  useEffect(() => {
    let cancelled = false
    fetch('/api/names')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((data: { name: string }[]) => {
        if (!cancelled && Array.isArray(data)) {
          const nameSet = new Set<string>()
          for (const entry of data) {
            nameSet.add(entry.name.toLowerCase())
          }
          setKnownNames(nameSet)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Fetch Twi word classifications for underline styling
  useEffect(() => {
    let cancelled = false
    // Extract all unique Twi words from verses
    const allWords: string[] = []
    for (const v of verses) {
      if (!v.twi_text) continue
      const words = v.twi_text.split(/\s+/)
      for (const w of words) {
        const cleaned = w.replace(/[^a-zA-ZɔɛɲŋàáèéìíòóùúâêîôûãẽĩõũƆƐ'-]/g, '')
        if (cleaned.length >= 2) allWords.push(cleaned)
      }
    }
    if (allWords.length === 0) return
    fetch('/api/twi/batch-classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: allWords }),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => { if (!cancelled) setTwiWordClasses(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [verses])

  // Build verse info for context menu
  function getVerseInfo(verseNum: number) {
    const v = verses.find(v => v.verse === verseNum)
    const text = v ? cleanKjvText(v.kjv_text) : ''
    return {
      reference: `${bookName} ${chapter}:${verseNum}`,
      text,
      book: bookName,
      chapter,
      verse_number: verseNum,
    }
  }

  function getVerseContext(verseNum: number) {
    const idx = verses.findIndex(v => v.verse === verseNum)
    const before = verses.slice(Math.max(0, idx - 2), idx).map(v => cleanKjvText(v.kjv_text))
    const after = verses.slice(idx + 1, idx + 3).map(v => cleanKjvText(v.kjv_text))
    return { before, after }
  }

  // Find the closest verse number from a DOM event target
  function findVerseFromTarget(target: HTMLElement): number | null {
    const el = target.closest('[data-verse-num]') as HTMLElement | null
    if (el?.dataset.verseNum) return parseInt(el.dataset.verseNum)
    return null
  }

  // Context menu handler — shared between long press and right click
  function openContextMenu(verseNum: number, x: number, y: number) {
    const v = verses.find(v => v.verse === verseNum)
    setActiveVerse(verseNum)
    setCtxMenu({ verse: getVerseInfo(verseNum), twiText: v?.twi_text || null, position: { x, y } })
  }

  // Right click on desktop — scoped to reader container
  function handleReaderContextMenu(e: React.MouseEvent) {
    const verseNum = findVerseFromTarget(e.target as HTMLElement)
    if (verseNum === null) return
    e.preventDefault()
    openContextMenu(verseNum, e.clientX, e.clientY)
  }

  // Long press on mobile — 500ms hold
  function handleReaderTouchStart(e: React.TouchEvent) {
    // Let pinch-to-zoom pass through
    if (e.touches.length > 1) return
    pinchStart(e)
    const target = e.target as HTMLElement
    const verseNum = findVerseFromTarget(target)
    if (verseNum === null) return
    longPressTriggered.current = false
    const touch = e.touches[0]
    const x = touch.clientX
    const y = touch.clientY
    longPressRef.current = setTimeout(() => {
      longPressTriggered.current = true
      openContextMenu(verseNum, x, y)
    }, 500)
  }

  function handleReaderTouchMove(e: React.TouchEvent) {
    pinchMove(e)
    setShowSizeIndicator(true)
    // Cancel long press on any movement
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null }
  }

  function handleReaderTouchEnd() {
    pinchEnd()
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null }
  }

  const glossaryMatchers = useMemo(() => {
    return glossaryTerms.filter((t) => t.twi_term).sort((a, b) => b.twi_term.length - a.twi_term.length)
  }, [glossaryTerms])

  const renderTwiWithGlossary = useCallback((text: string, verseRef: string) => {
    type Segment = { text: string; term: GlossaryTerm | null }
    const segments: Segment[] = [{ text, term: null }]
    for (const term of glossaryMatchers) {
      const pattern = new RegExp(`(${term.twi_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      for (let i = segments.length - 1; i >= 0; i--) {
        const seg = segments[i]
        if (seg.term) continue
        const parts = seg.text.split(pattern)
        if (parts.length <= 1) continue
        const newSegs: Segment[] = []
        for (const part of parts) {
          if (!part) continue
          if (part.toLowerCase() === term.twi_term.toLowerCase()) {
            newSegs.push({ text: part, term })
          } else {
            newSegs.push({ text: part, term: null })
          }
        }
        segments.splice(i, 1, ...newSegs)
      }
    }
    // Hover helpers for Modern theme blue highlight
    const modernHoverIn = isModern
      ? (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.08)' }
      : undefined
    const modernHoverOut = isModern
      ? (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }
      : undefined

    // Render each segment — Modern: solid blue hyperlinks; Traditional: dashed/dotted amber
    return (
      <>
        {segments.map((seg, i) => {
          if (seg.term) {
            // Glossary term — Modern: solid blue + bold; Traditional: dashed amber
            const glossaryWords = seg.text.split(/(\s+)/)
            return (
              <span key={i}>
                {glossaryWords.map((gw, gi) => {
                  const cleaned = gw.replace(/[^a-zA-ZɔɛɲŋàáèéìíòóùúâêîôûãẽĩõũƆƐ'-]/g, '')
                  if (/^\s+$/.test(gw) || cleaned.length < 2) return gw
                  const glossaryStyle: React.CSSProperties = isModern
                    ? {
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textDecorationStyle: 'solid',
                        textDecorationColor: '#2563EB',
                        textUnderlineOffset: '2px',
                        fontWeight: 700,
                        borderRadius: '2px',
                        transition: 'background 150ms, color 150ms',
                      }
                    : {
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textDecorationStyle: 'dashed',
                        textDecorationColor: 'rgba(184,134,11,0.7)',
                        textDecorationThickness: '2px',
                        textUnderlineOffset: '3px',
                        transition: 'color 150ms',
                      }
                  return (
                    <span
                      key={gi}
                      onClick={(e) => {
                        e.stopPropagation()
                        setTwiPanel({ word: cleaned, verseReference: verseRef, glossaryTerm: seg.term!.twi_term })
                      }}
                      style={glossaryStyle}
                      onMouseEnter={modernHoverIn}
                      onMouseLeave={modernHoverOut}
                    >
                      {gw}
                    </span>
                  )
                })}
              </span>
            )
          }
          // Non-glossary text — split into individual words, each tappable with classification-based styling
          const words = seg.text.split(/(\s+)/)
          return (
            <span key={i}>
              {words.map((w, j) => {
                const cleaned = w.replace(/[^a-zA-ZɔɛɲŋàáèéìíòóùúâêîôûãẽĩõũƆƐ'-]/g, '')
                if (cleaned.length < 2 || /^\s+$/.test(w)) return w
                const cls = twiWordClasses[cleaned.toLowerCase()]
                const hasUnderline = cls === 'strongs' || cls === 'dictionary'
                // Modern: solid blue (full or 60% opacity); Traditional: dotted/solid amber
                const wordStyle: React.CSSProperties = hasUnderline
                  ? isModern
                    ? {
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textDecorationStyle: 'solid',
                        textDecorationColor: cls === 'strongs' ? '#2563EB' : 'rgba(37,99,235,0.6)',
                        textUnderlineOffset: '2px',
                        borderRadius: '2px',
                        transition: 'background 150ms, color 150ms',
                      }
                    : {
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textDecorationStyle: cls === 'strongs' ? 'dotted' : 'solid',
                        textDecorationColor: cls === 'strongs' ? 'rgba(184,134,11,0.6)' : 'rgba(184,134,11,0.3)',
                        textUnderlineOffset: '3px',
                        transition: 'color 150ms',
                      }
                  : { cursor: 'pointer', transition: 'color 150ms' }
                return (
                  <span
                    key={j}
                    onClick={(e) => {
                      e.stopPropagation()
                      setTwiPanel({ word: cleaned, verseReference: verseRef })
                    }}
                    style={wordStyle}
                    onMouseEnter={hasUnderline ? modernHoverIn : undefined}
                    onMouseLeave={hasUnderline ? modernHoverOut : undefined}
                  >
                    {w}
                  </span>
                )
              })}
            </span>
          )
        })}
      </>
    )
  }, [glossaryMatchers, twiWordClasses, isModern])

  // (Strong's panel handles its own dismiss)

  // Check if a word is a known biblical proper noun
  function isProperNoun(word: string): boolean {
    if (knownNames.size === 0) return false
    const clean = word.replace(/[^a-zA-Z'-]/g, '')
    if (clean.length < 3) return false
    // Must start with uppercase
    if (clean[0] !== clean[0].toUpperCase() || clean[0] === clean[0].toLowerCase()) return false
    return knownNames.has(clean.toLowerCase())
  }

  function renderVerseWords(v: Verse, isFirst: boolean) {
    const words = verseWords?.[v.verse]
    const verseId = `verse-${v.verse}`
    const isHighlighted = highlightVerse === v.verse
    const highlightBg = isHighlighted ? (isModern ? 'rgba(15,52,96,0.08)' : 'rgba(255,208,96,0.12)') : 'transparent'
    const blockStyle: React.CSSProperties = { marginBottom: isModern ? '0.4rem' : '0.6rem', padding: '2px 4px', borderRadius: 3, background: highlightBg, transition: 'background 600ms ease' }

    if (!words || words.length === 0) {
      const text = cleanKjvText(v.kjv_text)
      if (isFirst && text.length > 0) {
        return (
          <div key={v.verse} id={verseId} data-verse-num={v.verse} style={blockStyle}>
            <span style={{ fontFamily: 'var(--font-reading)', fontSize: `${fontSize}px`, fontWeight: 400, color: textColor, lineHeight: 1.9 }}>
              <span style={{ float: 'left', fontFamily: 'var(--font-display)', fontSize: '52px', lineHeight: 0.8, paddingRight: '8px', paddingTop: '4px', color: textColor }}>{text[0]}</span>
              {text.slice(1)}
            </span>
          </div>
        )
      }
      return (
        <div key={v.verse} id={verseId} data-verse-num={v.verse} style={blockStyle}>
          <span style={{ fontFamily: 'var(--font-reading)', fontSize: `${fontSize}px`, fontWeight: 400, color: textColor, lineHeight: 1.9 }}>
            <strong style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 700, color: verseNumColor, marginRight: '6px', letterSpacing: '0.5px' }}>{v.verse}</strong>
            {text}
          </span>
        </div>
      )
    }

    const cleaned = words.map(w => ({ ...w, word_text: w.word_text.replace(/\{[^}]*\}?/g, '').trim() })).filter(w => w.word_text.length > 0)

    // Detect missing trailing words: check if verse_words covers the end of the verse
    const fullText = cleanKjvText(v.kjv_text)
    let trailingText = ''
    const lastWord = cleaned[cleaned.length - 1]?.word_text?.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
    const fullWords = fullText.split(/\s+/)
    const lastFullWord = fullWords[fullWords.length - 1]?.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
    if (lastWord && lastFullWord && lastWord !== lastFullWord) {
      // Find the last occurrence of the last verse_words word in the full text
      const lastClean = cleaned[cleaned.length - 1]?.word_text
      const lastIdx = fullText.lastIndexOf(lastClean)
      if (lastIdx >= 0) {
        trailingText = fullText.slice(lastIdx + lastClean.length).trim()
      }
    }

    return (
      <div key={v.verse} id={verseId} data-verse-num={v.verse} style={blockStyle}>
      <span style={{ fontFamily: 'var(--font-reading)', fontSize: `${fontSize}px`, fontWeight: 400, color: textColor, lineHeight: 1.9 }}>
        {!isFirst && (
          <strong
            style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 700, color: verseNumColor, marginRight: '6px', letterSpacing: '0.5px' }}
          >{v.verse}</strong>
        )}
        {cleaned.map((w, wi) => {
          if (isFirst && wi === 0) {
            return (
              <span key={w.word_position}>
                <span style={{ float: 'left', fontFamily: 'var(--font-display)', fontSize: '52px', lineHeight: 0.8, paddingRight: '8px', paddingTop: '4px', color: textColor }}>{w.word_text[0]}</span>
                {w.word_text.slice(1)}
              </span>
            )
          }
          const hasStrongs = showStrongs && w.strongs_number && strongsLookup?.[w.strongs_number]
          const isName = isProperNoun(w.word_text)
          const isClickable = hasStrongs || isName
          // Modern: solid blue hyperlink style; Traditional: dashed/dotted amber
          const engStyle: React.CSSProperties = isModern
            ? {
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationStyle: 'solid',
                textDecorationColor: isName ? '#2563EB' : '#2563EB',
                textUnderlineOffset: '2px',
                fontWeight: isName ? 700 : 400,
                borderRadius: '2px',
                transition: 'background 150ms, color 150ms',
              }
            : {
                cursor: 'pointer',
                textDecoration: 'underline',
                textDecorationStyle: isName ? 'dashed' : 'dotted',
                textDecorationColor: isName ? 'rgba(184,134,11,0.5)' : '#C8960A',
                textUnderlineOffset: '3px',
                transition: 'color 150ms',
              }
          return (
            <span key={w.word_position}>
              {wi > 0 || !isFirst ? ' ' : ''}
              {isClickable ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setResourcesPanel({
                      word: w.word_text.replace(/[^a-zA-Z'-]/g, ''),
                      strongsNumber: w.strongs_number,
                      isName,
                    })
                  }}
                  style={engStyle}
                  onMouseEnter={isModern ? (e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.08)' } : undefined}
                  onMouseLeave={isModern ? (e) => { e.currentTarget.style.background = 'transparent' } : undefined}
                >
                  {w.word_text}
                </span>
              ) : (
                w.word_text
              )}
            </span>
          )
        })}
        {trailingText ? ` ${trailingText}` : ''}
      </span>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-primary)', padding: '2rem 1rem', paddingBottom: 'calc(2rem + 60px)' }} className="relative">
      {/* Fixed side arrows — desktop only */}
      <button
        onClick={turnPrev}
        className="hidden md:flex items-center justify-center fixed z-20 transition-colors duration-200"
        style={{
          left: 'calc(50% - 480px)',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(200,169,110,0.12)',
          border: '1px solid rgba(200,169,110,0.3)',
          color: 'var(--gold)',
          cursor: prevHref ? 'pointer' : 'default',
          opacity: prevHref ? 1 : 0.3,
          pointerEvents: prevHref ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,169,110,0.25)'; e.currentTarget.style.borderColor = 'var(--gold)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(200,169,110,0.12)'; e.currentTarget.style.borderColor = 'rgba(200,169,110,0.3)' }}
        aria-label="Previous chapter"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M14 8L8 12L14 16" />
        </svg>
      </button>
      <button
        onClick={turnNext}
        className="hidden md:flex items-center justify-center fixed z-20 transition-colors duration-200"
        style={{
          right: 'calc(50% - 480px)',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(200,169,110,0.12)',
          border: '1px solid rgba(200,169,110,0.3)',
          color: 'var(--gold)',
          cursor: nextHref ? 'pointer' : 'default',
          opacity: nextHref ? 1 : 0.3,
          pointerEvents: nextHref ? 'auto' : 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,169,110,0.25)'; e.currentTarget.style.borderColor = 'var(--gold)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(200,169,110,0.12)'; e.currentTarget.style.borderColor = 'rgba(200,169,110,0.3)' }}
        aria-label="Next chapter"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M10 8L16 12L10 16" />
        </svg>
      </button>

      <PageTurn ref={pageTurnRef} onNext={goNext} onPrev={goPrev}>
        {/* Parchment book */}
        <div
          className="mx-auto relative"
          onTouchStart={handleReaderTouchStart}
          onTouchMove={handleReaderTouchMove}
          onTouchEnd={handleReaderTouchEnd}
          onContextMenu={handleReaderContextMenu}
          style={{
            maxWidth: '900px',
            background: parchmentBg,
            borderRadius: '4px',
            boxShadow: '-8px 0 20px rgba(0,0,0,0.5), 8px 0 20px rgba(0,0,0,0.3), 0 4px 40px rgba(0,0,0,0.6)',
            touchAction: 'pan-y',
          }}
        >
          {/* Font size indicator */}
          <div style={{
            position: 'absolute', top: 12, right: 16, zIndex: 5,
            fontFamily: 'var(--font-ui)', fontSize: 10, color: verseNumColor,
            opacity: showSizeIndicator ? 1 : 0,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
          }}>
            {fontSize}px
          </div>
          {/* Spine line — desktop only */}
          <div
            className="hidden lg:block absolute top-0 bottom-0 left-1/2 pointer-events-none"
            style={{
              width: '1px',
              background: 'linear-gradient(to bottom, transparent, rgba(139,107,20,0.3) 10%, rgba(139,107,20,0.3) 90%, transparent)',
            }}
          />

          <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
            {/* Reference chip — tappable, opens Navigator */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <button
                onClick={() => router.push('/bible')}
                style={{
                  fontFamily: 'var(--font-ui)', fontSize: 12, letterSpacing: '1px',
                  color: verseNumColor, background: 'transparent', border: 'none',
                  cursor: 'pointer', padding: '8px 12px',
                  textDecoration: 'underline', textDecorationStyle: 'dotted',
                  textUnderlineOffset: '3px', textDecorationColor: isModern ? 'rgba(15,52,96,0.3)' : 'rgba(200,160,40,0.4)',
                  transition: 'color 150ms',
                }}
              >
                {bookName} {chapter}:{activeVerse}
              </button>
            </div>
            {/* Reader toolbar — companion language + Strong's toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              {/* Companion translation dropdown */}
              <select
                value={showCompanion ? languageName : ''}
                onChange={(e) => {
                  if (e.target.value === '') { setShowCompanion(false) } else { setShowCompanion(true) }
                }}
                style={{
                  fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '1px',
                  color: verseNumColor, background: 'transparent',
                  border: `1px solid ${isModern ? 'rgba(15,52,96,0.2)' : 'rgba(200,160,40,0.3)'}`,
                  borderRadius: 3, padding: '4px 8px', cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="">No companion</option>
                {BPS_LANGUAGES.map(l => (
                  <option key={l.code} value={l.name} disabled={!l.active}>
                    {l.name}{!l.active ? ' — Coming soon' : ''}
                  </option>
                ))}
              </select>
              {/* Strong's toggle */}
              <button
                onClick={() => setShowStrongs(s => !s)}
                style={{
                  fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '1px',
                  color: verseNumColor, background: 'transparent',
                  border: `1px solid ${isModern ? 'rgba(15,52,96,0.2)' : 'rgba(200,160,40,0.3)'}`,
                  borderRadius: 3, padding: '4px 10px', cursor: 'pointer',
                }}
              >
                Strong&apos;s: {showStrongs ? 'ON' : 'OFF'}
              </button>
            </div>
            {/* Chapter heading */}
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '4px', color: 'rgba(200,160,40,0.9)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.5rem' }}>
              {bookName}
            </p>
            <p style={{ fontFamily: 'var(--font-reading)', fontSize: '11px', letterSpacing: '3px', color: verseNumColor, textTransform: 'uppercase', textAlign: 'center', marginBottom: '2.5rem' }}>
              Chapter {chapter}
            </p>

            {/* Two-column layout on desktop */}
            <div className={chapterHasTwi ? 'lg:grid lg:grid-cols-2 lg:gap-0' : ''}>
              {/* KJV Column */}
              <div className={chapterHasTwi ? 'lg:pr-8' : ''} style={{ color: textColor }}>
                {verses.map((v, i) => renderVerseWords(v, i === 0))}
              </div>

              {/* Twi Column — desktop */}
              {chapterHasTwi && (
                <div className="hidden lg:block" style={{ borderLeft: '1px solid rgba(139,107,20,0.2)', paddingLeft: '2rem', color: textColor }}>
                  {verses.map((v) => (
                    <div key={v.verse} style={{ marginBottom: isModern ? '0.4rem' : '0.6rem' }}>
                      <span style={{ fontFamily: 'var(--font-reading)', fontSize: `${Math.round(fontSize * 0.89)}px`, fontWeight: 400, color: v.twi_text ? '#3C2415' : '#B8A88A', lineHeight: 1.9, fontStyle: v.twi_text ? 'normal' : 'italic' }}>
                        <strong style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 700, color: verseNumColor, marginRight: '6px', letterSpacing: '0.5px' }}>
                          {v.verse}
                        </strong>
                        {v.twi_text ? renderTwiWithGlossary(v.twi_text, `${bookName} ${chapter}:${v.verse}`) : 'Translation coming'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Twi — mobile/tablet (below lg) */}
            {chapterHasTwi && (
              <div className="lg:hidden mt-6" style={{ borderTop: '1px solid rgba(139,107,20,0.2)', paddingTop: '1rem', color: textColor }}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: verseNumColor, marginBottom: '0.75rem' }}>
                  {languageName}
                </p>
                {verses.map((v) => (
                  <div key={v.verse} style={{ marginBottom: isModern ? '0.4rem' : '0.6rem' }}>
                  <span style={{ fontFamily: 'var(--font-reading)', fontSize: `${Math.round(fontSize * 0.89)}px`, fontWeight: 400, color: v.twi_text ? '#3C2415' : '#B8A88A', lineHeight: 1.9, fontStyle: v.twi_text ? 'normal' : 'italic' }}>
                    <strong style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 700, color: verseNumColor, marginRight: '6px' }}>
                      {v.verse}
                    </strong>
                    {v.twi_text ? renderTwiWithGlossary(v.twi_text, `${bookName} ${chapter}:${v.verse}`) : 'Translation coming'}
                  </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ height: '2px', background: 'rgba(139,107,20,0.1)', borderRadius: '0 0 4px 4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gold)', borderRadius: '1px', transition: 'width 300ms ease' }} />
          </div>
        </div>
      </PageTurn>

      {/* Navigation below parchment */}
      <div className="max-w-[900px] mx-auto flex items-center justify-between mt-6 px-2">
        {prevHref ? (
          <button onClick={goPrev} className="transition-colors duration-200 hover:text-[var(--gold)]" style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            &larr; Previous Chapter
          </button>
        ) : <span />}
        <span className="hidden sm:inline" style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '1px' }}>
          Use arrow keys to navigate
        </span>
        {nextHref ? (
          <button onClick={goNext} className="transition-colors duration-200 hover:text-[var(--gold)]" style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Next Chapter &rarr;
          </button>
        ) : <span />}
      </div>

      {/* Verse Context Menu — long press / right click */}
      {ctxMenu && (
        <VerseContextMenu
          verse={ctxMenu.verse}
          twiText={ctxMenu.twiText}
          position={ctxMenu.position}
          onClose={() => setCtxMenu(null)}
          onAskPastor={(v) => {
            const ctx = getVerseContext(v.verse_number)
            setPastorPanel({ verse: v, context: ctx })
          }}
          onKingsKingdoms={() => setKingsPanel(true)}
        />
      )}

      {/* Pastor Response Panel */}
      {pastorPanel && (
        <PastorResponsePanel
          verse={pastorPanel.verse}
          context={pastorPanel.context}
          onClose={() => setPastorPanel(null)}
          onGoDeeper={(word) => {
            setResourcesPanel({ word, isName: false })
          }}
        />
      )}

      {/* Resources Panel — unified Strong's, Names, and all reference sources */}
      {resourcesPanel && (
        <ResourcesPanel
          word={resourcesPanel.word}
          strongsNumber={resourcesPanel.strongsNumber}
          isName={resourcesPanel.isName}
          onClose={() => setResourcesPanel(null)}
        />
      )}

      {/* Twi Resources Panel */}
      {twiPanel && (
        <TwiResourcesPanel
          word={twiPanel.word}
          verseReference={twiPanel.verseReference}
          strongsNumber={twiPanel.strongsNumber}
          glossaryTerm={twiPanel.glossaryTerm}
          onClose={() => setTwiPanel(null)}
          onJumpToStrongs={(num, word) => {
            setTwiPanel(null)
            setResourcesPanel({ word, strongsNumber: num })
          }}
        />
      )}

      {/* Kings and Kingdoms Panel */}
      {kingsPanel && (
        <KingsPanel
          bookName={bookName}
          chapter={chapter}
          onClose={() => setKingsPanel(false)}
        />
      )}

      {/* Glossary Term Modal */}
      {selectedGlossary && (
        <GlossaryModal
          term={selectedGlossary}
          onClose={() => setSelectedGlossary(null)}
        />
      )}

      {/* Mobile bottom nav bar — single navigator button */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: 44, zIndex: 20,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          background: 'rgba(30,14,3,0.85)',
          backdropFilter: 'blur(4px)',
          borderTop: '1px solid rgba(200,150,80,0.15)',
        }}
      >
        <button
          onClick={() => router.push('/bible')}
          style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '1.5px', color: 'rgba(255,208,64,0.85)', background: 'transparent', border: 'none', padding: '0 20px', height: 44, cursor: 'pointer' }}
        >
          {bookName} {chapter} &middot; Navigate
        </button>
      </div>

      {/* Chapter sheet */}
      {chapterSheetOpen && (
        <ChapterSheet bookName={chapterSheetBook} onClose={() => setChapterSheetOpen(false)} />
      )}

      {/* Book sheet */}
      <BookSheet
        isOpen={bookSheetOpen}
        onClose={() => setBookSheetOpen(false)}
        currentBook={bookName}
        onBookSelect={(book) => {
          setBookSheetOpen(false)
          setChapterSheetBook(book)
          setChapterSheetOpen(true)
        }}
      />

    </div>
  )
}
