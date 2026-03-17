'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface BookEntry { book_name: string; testament: string; sort_order: number }
interface ChapterEntry { chapter: number; summary: string }

function BookButton({ name, selected, onClick }: { name: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ fontFamily: 'var(--font-reading)', fontSize: 15, color: selected ? '#8B6914' : '#2C1810', fontWeight: selected ? 600 : 400, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '2px 0', transition: 'color 150ms' }}
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

  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.from('chapter_summaries')
      .select('book_name, testament, sort_order')
      .order('sort_order', { ascending: true })
      .limit(2000)
      .then(({ data }) => {
        if (!data) return
        const seen = new Set<string>()
        const unique: BookEntry[] = []
        for (const row of data as BookEntry[]) {
          if (!seen.has(row.book_name)) {
            seen.add(row.book_name)
            unique.push(row)
          }
        }
        setBooks(unique)
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

  return (
    <div className="mx-auto relative" style={{ maxWidth: 900, background: 'var(--bg-warm)', borderRadius: 4, boxShadow: '-8px 0 20px rgba(0,0,0,0.5), 8px 0 20px rgba(0,0,0,0.3), 0 4px 40px rgba(0,0,0,0.6)', minHeight: '70vh' }}>
      {/* Close button */}
      <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, zIndex: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#8B6914', fontSize: 20 }}>
        &times;
      </button>

      {/* Spine */}
      <div className="hidden md:block" style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'linear-gradient(to bottom, transparent, rgba(139,107,20,0.3) 10%, rgba(139,107,20,0.3) 90%, transparent)', pointerEvents: 'none' }} />

      <div className="grid md:grid-cols-2" style={{ minHeight: '70vh' }}>
        {/* Left page — Old Testament */}
        <div style={{ padding: 'clamp(1.5rem, 3vw, 3rem)', color: '#2C1810' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '4px', color: '#8B6914', textTransform: 'uppercase', textAlign: 'center', marginBottom: '1.5rem' }}>
            Table of Contents
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '3px', color: '#8B6914', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Old Testament</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {otBooks.map((b) => (
              <BookButton key={b.book_name} name={b.book_name} selected={selectedBook === b.book_name} onClick={() => setSelectedBook(b.book_name)} />
            ))}
          </div>
        </div>

        {/* Right page — New Testament + Chapters */}
        <div style={{ padding: 'clamp(1.5rem, 3vw, 3rem)', borderLeft: '1px solid rgba(139,107,20,0.2)', color: '#2C1810' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '3px', color: '#8B6914', textTransform: 'uppercase', marginBottom: '0.5rem' }}>New Testament</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {ntBooks.map((b) => (
              <BookButton key={b.book_name} name={b.book_name} selected={selectedBook === b.book_name} onClick={() => setSelectedBook(b.book_name)} />
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(139,107,20,0.2)', margin: '1.25rem 0' }} />

          {/* Chapter list */}
          {!selectedBook ? (
            <p style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: 16, color: '#8B6914', opacity: 0.5, paddingTop: '0.5rem' }}>
              Select a book to see chapters
            </p>
          ) : (
            <>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '4px', color: '#8B6914', textTransform: 'uppercase', textAlign: 'center', marginBottom: '1rem' }}>
                {selectedBook}
              </p>
              {loadingChapters ? (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#8B6914', textAlign: 'center' }}>Loading...</p>
              ) : (
                <div className="space-y-0 max-h-[40vh] overflow-y-auto">
                  {chapters.map((c) => (
                    <button
                      key={c.chapter}
                      onClick={() => onSelect(selectedBook, c.chapter)}
                      className="w-full text-left flex items-baseline gap-2 transition-colors duration-150"
                      style={{ padding: '6px 8px', borderRadius: 2, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,107,20,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: '#8B6914', flexShrink: 0, minWidth: 24 }}>
                        {c.chapter}
                      </span>
                      <span className="truncate" style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 13, color: '#2C1810' }}>
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
