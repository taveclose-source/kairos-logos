'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface BookInfo {
  book_name: string
  testament: string
  sort_order: number
  chapter_count: number
}

interface BookSheetProps {
  isOpen: boolean
  onClose: () => void
  currentBook: string
  onBookSelect: (book: string) => void
}

export default function BookSheet({ isOpen, onClose, currentBook, onBookSelect }: BookSheetProps) {
  const [books, setBooks] = useState<BookInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    const sb = createSupabaseBrowser()
    sb.from('bible_books')
      .select('book_name, testament, sort_order')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        // Get chapter counts from chapter_summaries
        const bookList = data as { book_name: string; testament: string; sort_order: number }[]
        Promise.all(bookList.map(async (b) => {
          const { count } = await sb.from('chapter_summaries').select('*', { count: 'exact', head: true }).eq('book_name', b.book_name)
          return { ...b, chapter_count: count ?? 0 }
        })).then((result) => {
          setBooks(result)
          setLoading(false)
        })
      })
  }, [isOpen])

  if (!isOpen) return null

  const otBooks = books.filter(b => b.testament === 'OT')
  const ntBooks = books.filter(b => b.testament === 'NT')

  function handleTap(book: string) {
    onClose()
    setTimeout(() => onBookSelect(book), 50)
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 29, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '70vh', zIndex: 30,
        background: '#F8F2E2',
        borderRadius: '16px 16px 0 0',
        borderTop: '2px solid rgba(139,107,20,0.4)',
        overflowY: 'auto',
        animation: 'bookSheetUp 300ms ease-out',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(139,107,20,0.3) transparent',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid rgba(139,107,20,0.25)', position: 'sticky', top: 0, background: '#F8F2E2', zIndex: 2 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#1A0A04' }}>Books of the Bible</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8960A', fontSize: 20 }}>&times;</button>
        </div>

        <div style={{ padding: '0.5rem 1rem' }}>
          {loading ? (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: '#C8960A', textAlign: 'center', padding: '2rem 0' }}>Loading...</p>
          ) : (
            <>
              {/* Old Testament */}
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '3px', color: '#C8960A', textTransform: 'uppercase', marginTop: '0.75rem', marginBottom: '0.5rem' }}>Old Testament</p>
              {otBooks.map(b => (
                <button
                  key={b.book_name}
                  onClick={() => handleTap(b.book_name)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    width: '100%', textAlign: 'left', padding: '10px 8px',
                    background: b.book_name === currentBook ? 'rgba(139,107,20,0.08)' : 'transparent',
                    border: 'none', borderBottom: '0.5px solid rgba(139,107,20,0.12)', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-reading)', fontSize: 16, color: b.book_name === currentBook ? '#8B6914' : '#2C1810', fontWeight: b.book_name === currentBook ? 600 : 400 }}>
                    {b.book_name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#C8960A', opacity: 0.6 }}>
                    {b.chapter_count} ch
                  </span>
                </button>
              ))}

              {/* New Testament */}
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '3px', color: '#C8960A', textTransform: 'uppercase', marginTop: '1.25rem', marginBottom: '0.5rem' }}>New Testament</p>
              {ntBooks.map(b => (
                <button
                  key={b.book_name}
                  onClick={() => handleTap(b.book_name)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    width: '100%', textAlign: 'left', padding: '10px 8px',
                    background: b.book_name === currentBook ? 'rgba(139,107,20,0.08)' : 'transparent',
                    border: 'none', borderBottom: '0.5px solid rgba(139,107,20,0.12)', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-reading)', fontSize: 16, color: b.book_name === currentBook ? '#8B6914' : '#2C1810', fontWeight: b.book_name === currentBook ? 600 : 400 }}>
                    {b.book_name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: '#C8960A', opacity: 0.6 }}>
                    {b.chapter_count} ch
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes bookSheetUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
