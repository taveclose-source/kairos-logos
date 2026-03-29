'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { KJV_BOOKS } from '@/lib/verseCounts'
import { useTheme } from '@/contexts/ThemeContext'

type RangeFilter = 'All' | 'OT' | 'NT'

function getLastPosition(): { book: string; chapter: number; verse: number } {
  if (typeof window === 'undefined') return { book: 'Genesis', chapter: 1, verse: 1 }
  try {
    const stored = localStorage.getItem('logos_last_position')
    if (stored) {
      const p = JSON.parse(stored)
      if (p.book && p.chapter && p.verse) return p
    }
  } catch {}
  return { book: 'Genesis', chapter: 1, verse: 1 }
}

export default function BibleNavigator() {
  const router = useRouter()
  const { theme } = useTheme()
  const m = theme === 'modern'

  const lastPos = getLastPosition()
  const [range, setRange] = useState<RangeFilter>('All')
  const [selectedBook, setSelectedBook] = useState(lastPos.book)
  const [selectedChapter, setSelectedChapter] = useState(lastPos.chapter)
  const [selectedVerse, setSelectedVerse] = useState<number | null>(lastPos.verse)

  const bookRef = useRef<HTMLDivElement>(null)
  const chapterRef = useRef<HTMLDivElement>(null)
  const verseRef = useRef<HTMLDivElement>(null)
  const lastTapRef = useRef<{ target: string; time: number }>({ target: '', time: 0 })

  const accent = m ? '#0F3460' : 'var(--gold)'
  const accentBg = m ? 'rgba(15,52,96,0.08)' : 'rgba(255,208,96,0.12)'
  const accentBorder = m ? 'rgba(15,52,96,0.2)' : 'rgba(255,208,96,0.25)'
  const textPrimary = m ? '#1A1A1A' : 'var(--text-primary)'
  const textSecondary = m ? '#888' : 'var(--text-secondary)'
  const bg = m ? '#FFFFFF' : 'var(--bg-primary)'
  const colBg = m ? '#FAFAF9' : 'rgba(15,6,2,0.3)'
  const colBorder = m ? '#ECEAE6' : 'rgba(255,200,100,0.15)'

  // Filter books by range
  const filteredBooks = KJV_BOOKS.filter(b => range === 'All' || b.testament === (range === 'OT' ? 'OT' : 'NT'))

  // Chapter/verse counts for selected book
  const bookEntry = KJV_BOOKS.find(b => b.name === selectedBook)
  const chapterCount = bookEntry?.chapters.length ?? 0
  const verseCount = bookEntry && selectedChapter >= 1 && selectedChapter <= chapterCount
    ? bookEntry.chapters[selectedChapter - 1] : 0

  // Navigate to reader
  const navigate = useCallback((book: string, chapter: number, verse?: number) => {
    const pos = { book, chapter, verse: verse ?? 1 }
    localStorage.setItem('logos_last_position', JSON.stringify(pos))
    router.push(`/bible/${encodeURIComponent(book)}/${chapter}`)
  }, [router])

  // Double-click / long-press detection
  function handleDoubleTap(id: string, action: () => void, singleAction?: () => void) {
    const now = Date.now()
    if (lastTapRef.current.target === id && now - lastTapRef.current.time < 400) {
      action()
      lastTapRef.current = { target: '', time: 0 }
    } else {
      lastTapRef.current = { target: id, time: now }
      if (singleAction) singleAction()
    }
  }

  // Long press
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function startLongPress(action: () => void) {
    longPressTimer.current = setTimeout(action, 600)
  }
  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  // Scroll selected items into view on mount
  useEffect(() => {
    setTimeout(() => {
      bookRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' })
      chapterRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' })
      verseRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' })
    }, 100)
  }, [])

  const colStyle: React.CSSProperties = {
    flex: 1, minWidth: 0, maxHeight: 'calc(100vh - 180px)',
    overflowY: 'auto', background: colBg,
    border: `1px solid ${colBorder}`, borderRadius: 6,
    scrollbarWidth: 'thin',
  }

  const itemBase: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '10px 14px', border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-ui)', fontSize: 13,
    transition: 'background 100ms, color 100ms',
    background: 'transparent', color: textPrimary,
    borderBottom: `1px solid ${colBorder}`,
  }

  const selectedStyle: React.CSSProperties = {
    ...itemBase,
    background: accentBg,
    color: accent,
    fontWeight: 600,
    borderLeft: `3px solid ${accent}`,
    paddingLeft: '11px',
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem 1rem 0.75rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '4px', textTransform: 'uppercase', color: accent, marginBottom: 4 }}>
          Navigate
        </p>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: textSecondary }}>
          Select a book, chapter, and verse
        </p>
      </div>

      {/* Range filter */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '0.5rem 1rem 0.75rem' }}>
        {(['All', 'OT', 'NT'] as RangeFilter[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              padding: '6px 16px', borderRadius: 4, fontFamily: 'var(--font-ui)',
              fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase',
              border: `1px solid ${range === r ? accent : accentBorder}`,
              background: range === r ? accentBg : 'transparent',
              color: range === r ? accent : textSecondary,
              cursor: 'pointer', fontWeight: range === r ? 600 : 400,
              transition: 'all 150ms',
            }}
          >{r === 'All' ? 'All' : r === 'OT' ? 'Old Testament' : 'New Testament'}</button>
        ))}
      </div>

      {/* Four columns */}
      <div style={{ display: 'flex', gap: 6, padding: '0 0.75rem', height: 'calc(100vh - 200px)' }}
        className="flex-col sm:flex-row"
      >
        {/* Column 1: Books */}
        <div ref={bookRef} style={colStyle} className="!max-h-[35vh] sm:!max-h-[calc(100vh-200px)]">
          <div style={{ padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: textSecondary, borderBottom: `1px solid ${colBorder}` }}>
            Book
          </div>
          {filteredBooks.map(b => (
            <button
              key={b.name}
              data-selected={b.name === selectedBook}
              onClick={() => handleDoubleTap(`book-${b.name}`, () => navigate(b.name, 1), () => { setSelectedBook(b.name); setSelectedChapter(1); setSelectedVerse(null) })}
              onTouchStart={() => startLongPress(() => navigate(b.name, 1))}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              style={b.name === selectedBook ? selectedStyle : itemBase}
            >
              <span style={{ fontSize: 13 }}>{b.name}</span>
              <span style={{ fontSize: 10, color: textSecondary, marginLeft: 6 }}>{b.chapters.length} ch</span>
            </button>
          ))}
        </div>

        {/* Column 2: Chapters */}
        <div ref={chapterRef} style={colStyle} className="!max-h-[20vh] sm:!max-h-[calc(100vh-200px)]">
          <div style={{ padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: textSecondary, borderBottom: `1px solid ${colBorder}` }}>
            Chapter
          </div>
          {Array.from({ length: chapterCount }, (_, i) => i + 1).map(ch => (
            <button
              key={ch}
              data-selected={ch === selectedChapter}
              onClick={() => handleDoubleTap(`ch-${ch}`, () => navigate(selectedBook, ch), () => { setSelectedChapter(ch); setSelectedVerse(null) })}
              onTouchStart={() => startLongPress(() => navigate(selectedBook, ch))}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              style={ch === selectedChapter ? selectedStyle : itemBase}
            >
              {ch}
            </button>
          ))}
        </div>

        {/* Column 3: Verses */}
        <div ref={verseRef} style={colStyle} className="!max-h-[20vh] sm:!max-h-[calc(100vh-200px)]">
          <div style={{ padding: '8px 14px', fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: textSecondary, borderBottom: `1px solid ${colBorder}` }}>
            Verse
          </div>
          {Array.from({ length: verseCount }, (_, i) => i + 1).map(v => (
            <button
              key={v}
              data-selected={v === selectedVerse}
              onClick={() => { setSelectedVerse(v); navigate(selectedBook, selectedChapter, v) }}
              style={v === selectedVerse ? selectedStyle : itemBase}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Cancel button */}
      <div style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
        <button
          onClick={() => {
            const pos = getLastPosition()
            router.push(`/bible/${encodeURIComponent(pos.book)}/${pos.chapter}`)
          }}
          style={{
            fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px',
            textTransform: 'uppercase', color: textSecondary,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 20px',
          }}
        >
          Cancel — return to reader
        </button>
      </div>
    </div>
  )
}
