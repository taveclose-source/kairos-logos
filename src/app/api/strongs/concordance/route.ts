import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { strongsNumber, englishWord, testament, page = 0, limit = 50 } = await req.json()
  const supabase = db()
  const offset = page * limit

  if (strongsNumber) {
    const { data: words } = await supabase
      .from('verse_words')
      .select('book, chapter, verse')
      .eq('strongs_number', strongsNumber)
      .order('book')
      .order('chapter')
      .order('verse')
      .range(offset, offset + limit - 1)

    const { count } = await supabase
      .from('verse_words')
      .select('*', { count: 'exact', head: true })
      .eq('strongs_number', strongsNumber)

    if (!words || words.length === 0) {
      return NextResponse.json({ results: [], total: 0 })
    }

    const seen = new Set<string>()
    const unique = words.filter(w => {
      const key = `${w.book}:${w.chapter}:${w.verse}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    let filtered = unique
    if (testament) {
      const bookTestaments: Record<string, string> = {}
      for (const w of unique) {
        if (!bookTestaments[w.book]) {
          const { data: bb } = await supabase.from('bible_books').select('testament').eq('book_name', w.book).single()
          bookTestaments[w.book] = bb?.testament ?? ''
        }
      }
      filtered = unique.filter(w => bookTestaments[w.book] === testament)
    }

    const results = await Promise.all(filtered.slice(0, 100).map(async (w) => {
      const { data: book } = await supabase.from('bible_books').select('id').eq('book_name', w.book).single()
      if (!book) return null
      const { data: verse } = await supabase.from('bible_verses').select('kjv_text').eq('book_id', book.id).eq('chapter', w.chapter).eq('verse', w.verse).single()
      return { book: w.book, chapter: w.chapter, verse: w.verse, kjv_text: verse?.kjv_text ?? '' }
    }))

    return NextResponse.json({ results: results.filter(Boolean), total: testament ? filtered.length : (count ?? 0) })
  }

  if (englishWord && testament) {
    const cleanWord = englishWord.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
    if (!cleanWord) return NextResponse.json({ results: [], total: 0 })

    // Use ilike with % wildcard to catch word + trailing punctuation
    const { data: words } = await supabase
      .from('verse_words')
      .select('book, chapter, verse, word_text')
      .ilike('word_text', `${cleanWord}%`)
      .order('book')
      .order('chapter')
      .order('verse')
      .limit(1000)

    if (!words || words.length === 0) {
      return NextResponse.json({ results: [], total: 0 })
    }

    // Filter: only exact word matches (word_text stripped of punctuation must equal cleanWord)
    const exactMatches = words.filter(w => {
      const stripped = w.word_text.replace(/[^a-zA-Z'-]/g, '').toLowerCase()
      return stripped === cleanWord
    })

    // Filter by testament, deduplicate, cap at 100
    const seen = new Set<string>()
    const filtered: typeof exactMatches = []
    const bookTestaments: Record<string, string> = {}
    for (const w of exactMatches) {
      if (filtered.length >= 100) break
      const key = `${w.book}:${w.chapter}:${w.verse}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!bookTestaments[w.book]) {
        const { data: bb } = await supabase.from('bible_books').select('testament').eq('book_name', w.book).single()
        bookTestaments[w.book] = bb?.testament ?? ''
      }
      if (bookTestaments[w.book] === testament) filtered.push(w)
    }

    const results = await Promise.all(filtered.map(async (w) => {
      const { data: book } = await supabase.from('bible_books').select('id').eq('book_name', w.book).single()
      if (!book) return null
      const { data: verse } = await supabase.from('bible_verses').select('kjv_text').eq('book_id', book.id).eq('chapter', w.chapter).eq('verse', w.verse).single()
      return { book: w.book, chapter: w.chapter, verse: w.verse, kjv_text: verse?.kjv_text ?? '' }
    }))

    // Count total (approximate — based on unfiltered ilike matches for the testament)
    return NextResponse.json({ results: results.filter(Boolean), total: filtered.length })
  }

  return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
}
