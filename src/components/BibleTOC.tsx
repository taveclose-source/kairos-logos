'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface BookEntry { book_name: string; testament: string; sort_order: number }
interface ChapterEntry { chapter: number; summary: string }

function BookButton({ name, selected, onClick, mobile }: { name: string; selected: boolean; onClick: () => void; mobile?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{ fontFamily: 'var(--font-reading)', fontSize: mobile ? 11 : 15, color: selected ? '#8B6914' : '#2C1810', fontWeight: selected ? 600 : 400, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 0', transition: 'color 150ms', lineHeight: 1.3 }}
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
  const [chapters, setChapters] = useState<ChapterEntry[]>([])
  const [loadingChapters, setLoadingChapters] = useState(false)
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
        if (!data) return
        setBooks(data as BookEntry[])
      })
  }, [])

  useEffect(() => {
    if (!selectedBook) { setChapters([]); return }
    setLoadingChapters(true)
    const sb = createSupabaseBrowser()
    sb.from('chapter_summaries')
      .select('chapter, summary')
      .eq('book_name', selectedBook)
      .order('chapter', { ascending: true })
      .then(({ data }) => {
        setChapters((data as ChapterEntry[]) ?? [])
        setLoadingChapters(false)
      })
  }, [selectedBook])

  const otBooks = books.filter((b) => b.testament === 'OT')
  const ntBooks = books.filter((b) => b.testament === 'NT')

  const pad = isMobile ? '0.75rem' : 'clamp(1.5rem, 3vw, 3rem)'
  const headingSize = isMobile ? 8 : 9
  const headingSpacing = isMobile ? '2px' : '3px'
  const titleSize = isMobile ? 10 : 13
  const titleSpacing = isMobile ? '2px' : '4px'
  const chapterNumSize = isMobile ? 9 : 11
  const chapterSummarySize = isMobile ? 10 : 13
  const placeholderSize = isMobile ? 12 : 16

  return (
    <div className="mx-auto relative" style={{ maxWidth: 900, width: '100%', background: 'var(--bg-warm)', borderRadius: 4, boxShadow: '-8px 0 20px rgba(0,0,0,0.5), 8px 0 20px rgba(0,0,0,0.3), 0 4px 40px rgba(0,0,0,0.6)', minHeight: '70vh' }}>
      {/* Close button */}
      <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, zIndex: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#8B6914', fontSize: 20 }}>
        &times;
      </button>

      {/* Spine */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'linear-gradient(to bottom, transparent, rgba(139,107,20,0.3) 10%, rgba(139,107,20,0.3) 90%, transparent)', pointerEvents: 'none' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '70vh', width: '100%' }}>
        {/* Left page — Old Testament */}
        <div style={{ padding: pad, color: '#2C1810' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: titleSize, letterSpacing: titleSpacing, color: '#8B6914', textTransform: 'uppercase', textAlign: 'center', marginBottom: isMobile ? '0.75rem' : '1.5rem' }}>
            Table of Contents
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: headingSize, letterSpacing: headingSpacing, color: '#8B6914', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Old Testament</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '0 0.5rem' : '0 1rem' }}>
            {otBooks.map((b) => (
              <BookButton key={b.book_name} name={b.book_name} selected={selectedBook === b.book_name} onClick={() => setSelectedBook(b.book_name)} mobile={isMobile} />
            ))}
          </div>
        </div>

        {/* Right page — New Testament + Chapters */}
        <div style={{ padding: pad, borderLeft: '1px solid rgba(139,107,20,0.2)', color: '#2C1810' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: headingSize, letterSpacing: headingSpacing, color: '#8B6914', textTransform: 'uppercase', marginBottom: '0.5rem' }}>New Testament</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '0 0.5rem' : '0 1rem' }}>
            {ntBooks.map((b) => (
              <BookButton key={b.book_name} name={b.book_name} selected={selectedBook === b.book_name} onClick={() => setSelectedBook(b.book_name)} mobile={isMobile} />
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(139,107,20,0.2)', margin: isMobile ? '0.75rem 0' : '1.25rem 0' }} />

          {/* Chapter list */}
          {!selectedBook ? (
            <p style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: placeholderSize, color: '#8B6914', opacity: 0.5, paddingTop: '0.5rem' }}>
              Select a book to see chapters
            </p>
          ) : (
            <>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: titleSize, letterSpacing: titleSpacing, color: '#8B6914', textTransform: 'uppercase', textAlign: 'center', marginBottom: isMobile ? '0.5rem' : '1rem' }}>
                {selectedBook}
              </p>
              {loadingChapters ? (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8B6914', textAlign: 'center' }}>Loading...</p>
              ) : (
                <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                  {chapters.map((c) => (
                    <button
                      key={c.chapter}
                      onClick={() => onSelect(selectedBook, c.chapter)}
                      className="w-full text-left flex items-baseline gap-1 transition-colors duration-150"
                      style={{ padding: isMobile ? '4px 4px' : '6px 8px', borderRadius: 2, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,107,20,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: chapterNumSize, color: '#8B6914', flexShrink: 0, minWidth: isMobile ? 18 : 24 }}>
                        {c.chapter}
                      </span>
                      <span className="truncate" style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: chapterSummarySize, color: '#2C1810' }}>
                        {c.summary}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
