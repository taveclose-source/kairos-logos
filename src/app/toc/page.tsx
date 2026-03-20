'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useTheme } from '@/contexts/ThemeContext'
import ChapterSheet from '@/components/ChapterSheet'

interface Book { book_name: string; testament: string; sort_order: number }

export default function TOCPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [search, setSearch] = useState('')
  const [selectedBook, setSelectedBook] = useState<string | null>(null)
  const { theme } = useTheme()
  const m = theme === 'modern'
  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.from('bible_books').select('book_name, testament, sort_order').order('sort_order', { ascending: true }).then(({ data }) => {
      if (data) setBooks(data)
    })
  }, [])

  const filtered = search ? books.filter(b => b.book_name.toLowerCase().includes(search.toLowerCase())) : books
  const ot = filtered.filter(b => b.testament === 'OT')
  const nt = filtered.filter(b => b.testament === 'NT')

  function handleBook(bookName: string) {
    setSelectedBook(bookName)
  }

  const bookRowStyle = (testament: string) => m
    ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderLeft: `3px solid ${testament === 'NT' ? '#0F3460' : '#C8960A'}`, cursor: 'pointer', transition: 'background 150ms' }
    : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', cursor: 'pointer', transition: 'background 150ms' }

  return (
    <main style={{ minHeight: '100vh', paddingBottom: 70 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '2rem 1.5rem 1rem' }}>
        <h1 style={{ fontFamily: m ? "'Inter', sans-serif" : "'Cinzel', serif", fontSize: m ? 28 : 22, fontWeight: m ? 700 : 400, color: m ? '#1A1A1A' : '#FFD060', letterSpacing: m ? 0 : '3px', marginBottom: 4 }}>
          {m ? 'The Holy Bible' : 'THE HOLY BIBLE'}
        </h1>
        <p style={{ fontFamily: m ? "'Inter', sans-serif" : "'Cormorant Garamond', serif", fontSize: 13, color: m ? '#888' : 'var(--text-secondary)' }}>
          King James Version &middot; Textus Receptus
        </p>
        <div style={{ width: 60, height: m ? 2 : 1, background: m ? '#0F3460' : 'rgba(255,208,64,0.5)', margin: '1rem auto' }} />
      </div>

      {/* Search (Modern only) */}
      {m && (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 1.5rem 1rem' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search books..."
            style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: '1px solid #ECEAE6', fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#1A1A1A', outline: 'none' }}
          />
        </div>
      )}

      {/* Two columns */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: m ? '2rem' : '1.5rem' }}>
        {/* OT */}
        <div>
          <p style={{ fontFamily: m ? "'Inter', sans-serif" : "'Cinzel', serif", fontSize: m ? 10 : 9, letterSpacing: '3px', textTransform: 'uppercase', color: m ? '#888' : '#C8960A', marginBottom: 8 }}>Old Testament</p>
          {ot.map(b => (
            <div key={b.book_name} style={bookRowStyle(b.testament)}
              onClick={() => handleBook(b.book_name)}
              onMouseEnter={(e) => (e.currentTarget.style.background = m ? '#F5F5F5' : 'rgba(200,160,40,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontFamily: m ? "'Inter', sans-serif" : "'Cinzel', serif", fontSize: m ? 14 : 13, fontWeight: m ? 500 : 400, color: m ? '#1A1A1A' : '#FFD060' }}>{b.book_name}</span>
            </div>
          ))}
        </div>

        {/* NT */}
        <div>
          <p style={{ fontFamily: m ? "'Inter', sans-serif" : "'Cinzel', serif", fontSize: m ? 10 : 9, letterSpacing: '3px', textTransform: 'uppercase', color: m ? '#888' : '#C8960A', marginBottom: 8 }}>New Testament</p>
          {nt.map(b => (
            <div key={b.book_name} style={bookRowStyle(b.testament)}
              onClick={() => handleBook(b.book_name)}
              onMouseEnter={(e) => (e.currentTarget.style.background = m ? '#F5F5F5' : 'rgba(200,160,40,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontFamily: m ? "'Inter', sans-serif" : "'Cinzel', serif", fontSize: m ? 14 : 13, fontWeight: m ? 500 : 400, color: m ? '#1A1A1A' : '#FFD060' }}>{b.book_name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chapter sheet */}
      {selectedBook && <ChapterSheet bookName={selectedBook} onClose={() => setSelectedBook(null)} />}
    </main>
  )
}
