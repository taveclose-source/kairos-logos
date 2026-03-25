'use client'

import { useEffect, useCallback, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import PageTurn from '@/components/PageTurn'
import { playPageTurn } from '@/lib/paperSound'
import type { PageTurnHandle } from '@/components/PageTurn'
import GlossaryModal from '@/components/GlossaryModal'
import type { GlossaryTerm } from '@/components/GlossaryModal'
import { usePinchFontSize, DEFAULT_SIZE } from '@/hooks/usePinchFontSize'
import StrongsPanel from '@/components/StrongsPanel'
import NamesPanel from '@/components/NamesPanel'
import KingsPanel from '@/components/KingsPanel'
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
  const navColor = isModern ? 'rgba(15,52,96,0.6)' : 'rgba(139,107,20,0.5)'
  const navHoverColor = isModern ? 'rgba(15,52,96,1)' : 'rgba(139,107,20,0.9)'
  const chapterHasTwi = verses.some((v) => v.twi_text !== null)
  const progress = totalChapters > 0 ? (chapter / totalChapters) * 100 : 0
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([])
  const [selectedGlossary, setSelectedGlossary] = useState<GlossaryTerm | null>(null)
  const pageTurnRef = useRef<PageTurnHandle>(null)
  const { fontSize, setFontSize, onTouchStart: pinchStart, onTouchMove: pinchMove, onTouchEnd: pinchEnd } = usePinchFontSize()
  const [showSizeIndicator, setShowSizeIndicator] = useState(false)
  const [strongsPanel, setStrongsPanel] = useState<{ number: string; word: string } | null>(null)
  const [namesPanel, setNamesPanel] = useState<string | null>(null)
  const [kingsPanel, setKingsPanel] = useState(false)
  const [verseMenu, setVerseMenu] = useState<{ verse: number; x: number; y: number } | null>(null)
  const [knownNames, setKnownNames] = useState<Set<string>>(new Set())
  const [chapterSheetOpen, setChapterSheetOpen] = useState(false)
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

  // Save last read position
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('logos_last_read', JSON.stringify({ book: bookName, chapter }))
    }
  }, [bookName, chapter])

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

  // Pinch touch handlers that also show indicator
  const handlePinchStart = useCallback((e: React.TouchEvent) => { pinchStart(e) }, [pinchStart])
  const handlePinchMove = useCallback((e: React.TouchEvent) => { pinchMove(e); setShowSizeIndicator(true) }, [pinchMove])
  const handlePinchEnd = useCallback(() => { pinchEnd() }, [pinchEnd])

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

  // Close verse menu when clicking elsewhere
  useEffect(() => {
    if (!verseMenu) return
    function handleClick() { setVerseMenu(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [verseMenu])

  const glossaryMatchers = useMemo(() => {
    return glossaryTerms.filter((t) => t.twi_term).sort((a, b) => b.twi_term.length - a.twi_term.length)
  }, [glossaryTerms])

  const renderTwiWithGlossary = useCallback((text: string) => {
    if (glossaryMatchers.length === 0) return <>{text}</>
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
    return (
      <>
        {segments.map((seg, i) =>
          seg.term ? (
            <span
              key={i}
              onClick={() => setSelectedGlossary(seg.term)}
              className="cursor-pointer underline decoration-emerald-500 decoration-2 underline-offset-2 hover:decoration-emerald-700 hover:bg-emerald-50/50 rounded-sm transition-colors"
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </>
    )
  }, [glossaryMatchers])

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

  // Verse number click handler — opens context menu
  function handleVerseClick(e: React.MouseEvent, verseNum: number) {
    e.stopPropagation()
    e.preventDefault()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setVerseMenu({ verse: verseNum, x: rect.left, y: rect.bottom + 4 })
  }

  function renderVerseWords(v: Verse, isFirst: boolean) {
    const words = verseWords?.[v.verse]
    if (!words || words.length === 0) {
      // Fallback to plain text
      const text = cleanKjvText(v.kjv_text)
      if (isFirst && text.length > 0) {
        return (
          <span key={v.verse} style={{ fontFamily: 'var(--font-reading)', fontSize: `${fontSize}px`, fontWeight: 400, color: textColor, lineHeight: 1.9 }}>
            <span style={{ float: 'left', fontFamily: 'var(--font-display)', fontSize: '52px', lineHeight: 0.8, paddingRight: '8px', paddingTop: '4px', color: textColor }}>{text[0]}</span>
            {text.slice(1)}{' '}
          </span>
        )
      }
      return (
        <span key={v.verse} style={{ fontFamily: 'var(--font-reading)', fontSize: `${fontSize}px`, fontWeight: 400, color: textColor, lineHeight: 1.9 }}>
          <sup
            onClick={(e) => handleVerseClick(e, v.verse)}
            style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 500, color: verseNumColor, verticalAlign: 'super', marginRight: '3px', letterSpacing: '0.5px', cursor: 'pointer' }}
          >{v.verse}</sup>
          {text}{' '}
        </span>
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
      <span key={v.verse} style={{ fontFamily: 'var(--font-reading)', fontSize: `${fontSize}px`, fontWeight: 400, color: textColor, lineHeight: 1.9 }}>
        {!isFirst && (
          <sup
            onClick={(e) => handleVerseClick(e, v.verse)}
            style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 500, color: verseNumColor, verticalAlign: 'super', marginRight: '3px', letterSpacing: '0.5px', cursor: 'pointer' }}
          >{v.verse}</sup>
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
          const hasStrongs = w.strongs_number && strongsLookup?.[w.strongs_number]
          const isName = isProperNoun(w.word_text)
          return (
            <span key={w.word_position}>
              {wi > 0 || !isFirst ? ' ' : ''}
              {hasStrongs ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setStrongsPanel({ number: w.strongs_number!, word: w.word_text })
                  }}
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: verseNumColor, textUnderlineOffset: '3px', transition: 'color 150ms' }}
                >
                  {w.word_text}
                </span>
              ) : isName ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setNamesPanel(w.word_text.replace(/[^a-zA-Z'-]/g, ''))
                  }}
                  style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dashed', textDecorationColor: isModern ? 'rgba(15,52,96,0.4)' : 'rgba(184,134,11,0.5)', textUnderlineOffset: '3px', transition: 'color 150ms' }}
                >
                  {w.word_text}
                </span>
              ) : (
                w.word_text
              )}
            </span>
          )
        })}
        {trailingText ? ` ${trailingText}` : ''}{' '}
      </span>
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
          onTouchStart={handlePinchStart}
          onTouchMove={handlePinchMove}
          onTouchEnd={handlePinchEnd}
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
            {/* Top nav — All Books / All Chapters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <button
                onClick={() => { playPageTurn('back'); setBookSheetOpen(true) }}
                style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: navColor, background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 0 8px 4px', transition: 'color 150ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = navHoverColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(139,107,20,0.5)')}
              >
                &lsaquo; All Books
              </button>
              <button
                onClick={() => { playPageTurn('forward'); setChapterSheetBook(bookName); setChapterSheetOpen(true) }}
                style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: navColor, background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 4px 8px 0', transition: 'color 150ms' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = navHoverColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(139,107,20,0.5)')}
              >
                All Chapters &rsaquo;
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
                    <span key={v.verse} style={{ fontFamily: 'var(--font-reading)', fontSize: `${Math.round(fontSize * 0.89)}px`, fontWeight: 400, color: v.twi_text ? '#3C2415' : '#B8A88A', lineHeight: 1.9, fontStyle: v.twi_text ? 'normal' : 'italic' }}>
                      <sup style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 500, color: verseNumColor, verticalAlign: 'super', marginRight: '3px', letterSpacing: '0.5px' }}>
                        {v.verse}
                      </sup>
                      {v.twi_text ? renderTwiWithGlossary(v.twi_text) : 'Translation coming'}{' '}
                    </span>
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
                  <span key={v.verse} style={{ fontFamily: 'var(--font-reading)', fontSize: `${Math.round(fontSize * 0.89)}px`, fontWeight: 400, color: v.twi_text ? '#3C2415' : '#B8A88A', lineHeight: 1.9, fontStyle: v.twi_text ? 'normal' : 'italic' }}>
                    <sup style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 500, color: verseNumColor, verticalAlign: 'super', marginRight: '3px' }}>
                      {v.verse}
                    </sup>
                    {v.twi_text ? renderTwiWithGlossary(v.twi_text) : 'Translation coming'}{' '}
                  </span>
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

      {/* Verse context menu */}
      {verseMenu && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(verseMenu.x, window.innerWidth - 220),
            top: verseMenu.y,
            zIndex: 60,
            background: isModern ? '#FFFFFF' : '#F8F2E2',
            border: '1px solid rgba(139,107,20,0.3)',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            minWidth: 200,
            overflow: 'hidden',
            animation: 'menuFade 150ms ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(139,107,20,0.15)' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: isModern ? '#888' : '#8B5E10' }}>
              {bookName} {chapter}:{verseMenu.verse}
            </span>
          </div>
          <button
            onClick={() => { setKingsPanel(true); setVerseMenu(null) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', textAlign: 'left', padding: '10px 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 12, color: isModern ? '#1A1A1A' : '#1A0A04',
              transition: 'background 150ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,107,20,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
          >
            <span style={{ fontSize: 16 }}>&#127760;</span>
            <span>What was happening in the world?</span>
          </button>
        </div>
      )}

      {/* Strong's Panel */}
      {strongsPanel && (
        <StrongsPanel
          strongsNumber={strongsPanel.number}
          englishWord={strongsPanel.word}
          onClose={() => setStrongsPanel(null)}
        />
      )}

      {/* Names Lookup Panel */}
      {namesPanel && (
        <NamesPanel
          name={namesPanel}
          onClose={() => setNamesPanel(null)}
          onStrongsOpen={(num, word) => {
            setNamesPanel(null)
            setStrongsPanel({ number: num, word })
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

      {/* Mobile bottom nav bar */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          height: 44, zIndex: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(30,14,3,0.85)',
          backdropFilter: 'blur(4px)',
          borderTop: '1px solid rgba(200,150,80,0.15)',
        }}
      >
        <button
          onClick={() => { playPageTurn('back'); setBookSheetOpen(true) }}
          style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,208,64,0.85)', background: 'transparent', border: 'none', padding: '0 20px', height: 44, cursor: 'pointer' }}
        >
          &lsaquo; All Books
        </button>
        <button
          onClick={() => { playPageTurn('forward'); setChapterSheetBook(bookName); setChapterSheetOpen(true) }}
          style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,208,64,0.85)', background: 'transparent', border: 'none', padding: '0 20px', height: 44, cursor: 'pointer' }}
        >
          All Chapters &rsaquo;
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

      {/* Animations for verse menu */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes menuFade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  )
}
