'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { playPageTurn } from '@/lib/paperSound'
import { useSwipe } from '@/hooks/useSwipe'
import { getShuffleDuration, getShuffleDirection, getLastRead, playShuffleSounds } from '@/lib/biblePosition'

interface BookEntry { book_name: string; testament: string; sort_order: number }
interface ChapterEntry { chapter: number; summary: string }

type View = 'books' | 'chapters'

function BookButton({ name, selected, onClick, small }: { name: string; selected: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ fontFamily: 'var(--font-reading)', fontSize: small ? 11 : 15, color: selected ? '#8B6914' : '#2C1810', fontWeight: selected ? 600 : 400, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 0', transition: 'color 150ms', lineHeight: 1.3 }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.color = '#8B6914' }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.color = '#2C1810' }}
    >
      {name}
    </button>
  )
}

export default function BibleTOC({ onSelect, onClose }: { onSelect: (book: string, chapter: number) => void; onClose: () => void }) {
  const [books, setBooks] = useState<BookEntry[]>([])
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const [selectedTestament, setSelectedTestament] = useState<string>('')
  const [chapters, setChapters] = useState<ChapterEntry[]>([])
  const [loadingChapters, setLoadingChapters] = useState(false)
  const [view, setView] = useState<View>('books')
  const [transitioning, setTransitioning] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.from('bible_books')
      .select('book_name, testament, sort_order')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data) setBooks(data as BookEntry[])
      })
  }, [])

  function handleBookSelect(book: BookEntry) {
    playPageTurn('forward')
    setSelectedBook(book.book_name)
    setSelectedTestament(book.testament === 'OT' ? 'Old Testament' : 'New Testament')
    setLoadingChapters(true)

    const sb = createSupabaseBrowser()
    sb.from('chapter_summaries')
      .select('chapter, summary')
      .eq('book_name', book.book_name)
      .order('chapter', { ascending: true })
      .then(({ data }) => {
        setChapters((data as ChapterEntry[]) ?? [])
        setLoadingChapters(false)
      })

    // Transition animation
    setTransitioning(true)
    setTimeout(() => {
      setView('chapters')
      setTransitioning(false)
    }, 200)
  }

  function handleBack() {
    playPageTurn('back')
    setTransitioning(true)
    setTimeout(() => {
      setView('books')
      setTransitioning(false)
    }, 200)
  }

  const router = useRouter()

  // Swipe on main TOC (books view)
  const swipeBooksTocLeft = useCallback(() => {
    playPageTurn('forward')
    const genesis = books.find((b) => b.book_name === 'Genesis')
    if (genesis) handleBookSelect(genesis)
  }, [books]) // eslint-disable-line react-hooks/exhaustive-deps

  const swipeBooksTocRight = useCallback(() => {
    playPageTurn('back')
    onClose()
  }, [onClose])

  const booksSwipe = useSwipe(swipeBooksTocLeft, swipeBooksTocRight)

  // Swipe on chapter view
  const swipeChapterLeft = useCallback(() => {
    if (!selectedBook) return
    const lastRead = getLastRead()
    const duration = getShuffleDuration(lastRead?.book ?? null, selectedBook)
    const dir = getShuffleDirection(lastRead?.book ?? null, selectedBook)
    playShuffleSounds(duration, dir, playPageTurn)
    setTimeout(() => router.push(`/bible/${encodeURIComponent(selectedBook)}/1`), duration)
  }, [selectedBook, router])

  const swipeChapterRight = useCallback(() => {
    playPageTurn('back')
    handleBack()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const chapterSwipe = useSwipe(swipeChapterLeft, swipeChapterRight)

  const otBooks = books.filter((b) => b.testament === 'OT')
  const ntBooks = books.filter((b) => b.testament === 'NT')

  const pad = isMobile ? '0.75rem' : 'clamp(1.5rem, 3vw, 3rem)'
  const headingSize = isMobile ? 8 : 9
  const headingSpacing = isMobile ? '2px' : '3px'

  return (
    <div className="mx-auto relative" style={{ maxWidth: 900, width: '100%', background: 'var(--bg-warm)', borderRadius: 4, boxShadow: '-8px 0 20px rgba(0,0,0,0.5), 8px 0 20px rgba(0,0,0,0.3), 0 4px 40px rgba(0,0,0,0.6)', minHeight: '70vh', overflow: 'hidden' }}>
      {/* Close button */}
      <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, zIndex: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#8B6914', fontSize: 20 }}>
        &times;
      </button>

      {/* ── BOOKS VIEW ── */}
      <div
        onTouchStart={booksSwipe.onTouchStart}
        onTouchEnd={booksSwipe.onTouchEnd}
        onMouseDown={booksSwipe.onMouseDown}
        onMouseUp={booksSwipe.onMouseUp}
        style={{
        opacity: view === 'books' && !transitioning ? 1 : 0,
        transform: view === 'books' && !transitioning ? 'translateX(0)' : 'translateX(-20px)',
        transition: 'opacity 200ms ease, transform 200ms ease',
        position: view === 'books' ? 'relative' : 'absolute',
        inset: view === 'books' ? undefined : 0,
        pointerEvents: view === 'books' && !transitioning ? 'auto' : 'none',
      }}>
        {/* Spine */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'linear-gradient(to bottom, transparent, rgba(139,107,20,0.3) 10%, rgba(139,107,20,0.3) 90%, transparent)', pointerEvents: 'none' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '70vh' }}>
          {/* Left page — OT */}
          <div style={{ padding: pad, color: '#2C1810' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 10 : 13, letterSpacing: isMobile ? '2px' : '4px', color: '#8B6914', textTransform: 'uppercase', textAlign: 'center', marginBottom: isMobile ? '0.75rem' : '1.5rem' }}>
              Table of Contents
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: headingSize, letterSpacing: headingSpacing, color: '#8B6914', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Old Testament</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '0 0.5rem' : '0 1rem' }}>
              {otBooks.map((b) => (
                <BookButton key={b.book_name} name={b.book_name} selected={selectedBook === b.book_name} onClick={() => handleBookSelect(b)} small={isMobile} />
              ))}
            </div>
          </div>

          {/* Right page — NT */}
          <div style={{ padding: pad, borderLeft: '1px solid rgba(139,107,20,0.2)', color: '#2C1810' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: headingSize, letterSpacing: headingSpacing, color: '#8B6914', textTransform: 'uppercase', marginBottom: '0.5rem' }}>New Testament</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '0 0.5rem' : '0 1rem' }}>
              {ntBooks.map((b) => (
                <BookButton key={b.book_name} name={b.book_name} selected={selectedBook === b.book_name} onClick={() => handleBookSelect(b)} small={isMobile} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CHAPTERS VIEW ── */}
      <div
        onTouchStart={chapterSwipe.onTouchStart}
        onTouchEnd={chapterSwipe.onTouchEnd}
        onMouseDown={chapterSwipe.onMouseDown}
        onMouseUp={chapterSwipe.onMouseUp}
        style={{
        opacity: view === 'chapters' && !transitioning ? 1 : 0,
        transform: view === 'chapters' && !transitioning ? 'translateX(0)' : 'translateX(20px)',
        transition: 'opacity 200ms ease, transform 200ms ease',
        position: view === 'chapters' ? 'relative' : 'absolute',
        inset: view === 'chapters' ? undefined : 0,
        pointerEvents: view === 'chapters' && !transitioning ? 'auto' : 'none',
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Sticky header */}
        <div style={{ padding: `${pad} ${pad} 0`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button
              onClick={handleBack}
              style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', color: '#8B6914', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              &larr; All Books
            </button>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 14 : 18, color: '#2C1810', letterSpacing: '3px' }}>
              {selectedBook}
            </span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', color: '#8B6914', textTransform: 'uppercase' }}>
              {selectedTestament}
            </span>
          </div>
          <div style={{ width: '100%', height: 1, background: 'rgba(139,107,20,0.25)' }} />
        </div>

        {/* Chapter grid — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: pad, maxHeight: '70vh', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,107,20,0.3) transparent' }}>
          {loadingChapters ? (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8B6914', textAlign: 'center', paddingTop: '2rem' }}>Loading...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 0 }}>
              {chapters.map((c) => (
                <button
                  key={c.chapter}
                  onClick={() => {
                    const lastRead = getLastRead()
                    const duration = getShuffleDuration(lastRead?.book ?? null, selectedBook!)
                    const dir = getShuffleDirection(lastRead?.book ?? null, selectedBook!)
                    playShuffleSounds(duration, dir, playPageTurn)
                    setTimeout(() => onSelect(selectedBook!, c.chapter), duration)
                  }}
                  style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid rgba(139,107,20,0.15)', background: 'transparent', border: 'none', borderBottomWidth: '0.5px', borderBottomStyle: 'solid', borderBottomColor: 'rgba(139,107,20,0.15)', cursor: 'pointer', textAlign: 'left', transition: 'background 150ms' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,107,20,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 9 : 11, letterSpacing: '2px', color: '#8B6914', display: 'block', marginBottom: 4 }}>
                    CHAPTER {c.chapter}
                  </span>
                  <span style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: isMobile ? 12 : 14, color: '#2C1810', lineHeight: 1.5, display: 'block' }}>
                    {c.summary}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
