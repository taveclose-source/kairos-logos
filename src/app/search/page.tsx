'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useTheme } from '@/contexts/ThemeContext'

interface Result { book: string; chapter: number; verse: number; kjv_text: string; type: 'verse' | 'strongs' }

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { theme } = useTheme()
  const m = theme === 'modern'

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSearch(q: string) {
    setQuery(q)
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)

    const sb = createSupabaseBrowser()

    // Check if Strong's number
    if (/^[GH]\d+$/i.test(q.trim())) {
      const { data } = await sb.from('strongs_entries').select('strongs_number, original_word, definition').ilike('strongs_number', q.trim()).limit(5)
      setResults((data ?? []).map(d => ({ book: d.strongs_number, chapter: 0, verse: 0, kjv_text: `${d.original_word} — ${(d.definition ?? '').slice(0, 120)}`, type: 'strongs' as const })))
      setSearching(false)
      return
    }

    // Check if book+chapter pattern
    const bookMatch = q.trim().match(/^(\d?\s*\w+)\s+(\d+)$/i)
    if (bookMatch) {
      const bookQuery = bookMatch[1].trim()
      const ch = parseInt(bookMatch[2])
      const { data: bookRow } = await sb.from('bible_books').select('id, book_name').ilike('book_name', `%${bookQuery}%`).limit(1).single()
      if (bookRow) {
        const { data: verses } = await sb.from('bible_verses').select('chapter, verse, kjv_text').eq('book_id', bookRow.id).eq('chapter', ch).order('verse').limit(20)
        setResults((verses ?? []).map(v => ({ book: bookRow.book_name, chapter: v.chapter, verse: v.verse, kjv_text: v.kjv_text.replace(/\s*\{[^}]*\}\s*/g, ' ').trim().slice(0, 150), type: 'verse' as const })))
        setSearching(false)
        return
      }
    }

    // Full text search via verse_words
    const { data: words } = await sb.from('verse_words').select('book, chapter, verse').ilike('word_text', `${q.trim()}%`).limit(50)
    if (words && words.length > 0) {
      const seen = new Set<string>()
      const unique = words.filter(w => { const k = `${w.book}:${w.chapter}:${w.verse}`; if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 10)
      const verseResults = await Promise.all(unique.map(async (w) => {
        const { data: bk } = await sb.from('bible_books').select('id').eq('book_name', w.book).single()
        if (!bk) return null
        const { data: v } = await sb.from('bible_verses').select('kjv_text').eq('book_id', bk.id).eq('chapter', w.chapter).eq('verse', w.verse).single()
        return { book: w.book, chapter: w.chapter, verse: w.verse, kjv_text: (v?.kjv_text ?? '').replace(/\s*\{[^}]*\}\s*/g, ' ').trim().slice(0, 150), type: 'verse' as const }
      }))
      setResults(verseResults.filter(Boolean) as Result[])
    } else {
      setResults([])
    }
    setSearching(false)
  }

  return (
    <main style={{ minHeight: '100vh', padding: '1.5rem', paddingBottom: 70 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search verses, books, Strong's numbers..."
          style={{
            width: '100%', padding: '14px 18px',
            borderRadius: m ? 10 : 4,
            border: m ? '1px solid #ECEAE6' : '1px solid rgba(200,160,40,0.3)',
            background: m ? '#FFFFFF' : '#F8F2E2',
            fontFamily: m ? "'Inter', sans-serif" : 'var(--font-ui)',
            fontSize: 16, color: m ? '#1A1A1A' : '#1A0A04',
            outline: 'none', marginBottom: '1rem',
          }}
        />

        {searching && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: m ? '#888' : 'var(--text-tertiary)' }}>Searching...</p>}

        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r, i) => (
              <Link key={i} href={r.type === 'verse' ? `/bible/${encodeURIComponent(r.book)}/${r.chapter}` : `/bible/Matthew/1`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: m ? '#FFFFFF' : '#F8F2E2',
                  border: m ? '1px solid #ECEAE6' : '1px solid rgba(200,160,40,0.2)',
                  borderRadius: m ? 10 : 4,
                  padding: '12px 16px',
                }}>
                  <p style={{ fontFamily: m ? "'Inter', sans-serif" : 'var(--font-display)', fontSize: 12, fontWeight: m ? 600 : 400, color: m ? '#0F3460' : '#C8960A', marginBottom: 4 }}>
                    {r.type === 'verse' ? `${r.book} ${r.chapter}:${r.verse}` : r.book}
                  </p>
                  <p style={{ fontFamily: m ? "'Inter', sans-serif" : "'Cormorant Garamond', serif", fontSize: 14, color: m ? '#444' : '#1A0A04', lineHeight: 1.5 }}>
                    {r.kjv_text}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {query.length >= 2 && !searching && results.length === 0 && (
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: m ? '#888' : 'var(--text-tertiary)', textAlign: 'center', marginTop: '2rem' }}>No results found</p>
        )}
      </div>
    </main>
  )
}
