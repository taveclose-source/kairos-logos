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
    // Strong's concordance: find all verses with this Strong's number
    const { data: words } = await supabase
      .from('verse_words')
      .select('book, chapter, verse')
      .eq('strongs_number', strongsNumber)
      .order('book')
      .order('chapter')
      .order('verse')
      .range(offset, offset + limit - 1)

    // Count total
    const { count } = await supabase
      .from('verse_words')
      .select('*', { count: 'exact', head: true })
      .eq('strongs_number', strongsNumber)

    if (!words || words.length === 0) {
      return NextResponse.json({ results: [], total: 0 })
    }

    // Deduplicate (same verse can have multiple words with same strongs)
    const seen = new Set<string>()
    const unique = words.filter(w => {
      const key = `${w.book}:${w.chapter}:${w.verse}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Filter by testament if provided (for KJV concordance tab)
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

    // Fetch verse texts
    const results = await Promise.all(filtered.map(async (w) => {
      const { data: book } = await supabase.from('bible_books').select('id').eq('book_name', w.book).single()
      if (!book) return null
      const { data: verse } = await supabase.from('bible_verses').select('kjv_text').eq('book_id', book.id).eq('chapter', w.chapter).eq('verse', w.verse).single()
      return { book: w.book, chapter: w.chapter, verse: w.verse, kjv_text: verse?.kjv_text ?? '' }
    }))

    return NextResponse.json({ results: results.filter(Boolean), total: testament ? filtered.length : (count ?? 0) })
  }

  if (englishWord && testament) {
    // English concordance: index-friendly pattern matching
    const cleanWord = englishWord.replace(/[^a-zA-Z'-]/g, '')
    if (!cleanWord) return NextResponse.json({ results: [], total: 0 })

    // Use OR patterns that leverage btree index on word_text
    const patterns = [cleanWord, `${cleanWord}.`, `${cleanWord},`, `${cleanWord};`, `${cleanWord}:`, `${cleanWord}?`, `${cleanWord}!`]

    const { data: words } = await supabase
      .from('verse_words')
      .select('book, chapter, verse')
      .or(patterns.map(p => `word_text.ilike.${p}`).join(','))
      .order('book')
      .order('chapter')
      .order('verse')
      .limit(1000)

    const { count } = await supabase
      .from('verse_words')
      .select('*', { count: 'exact', head: true })
      .or(patterns.map(p => `word_text.ilike.${p}`).join(','))

    if (!words || words.length === 0) {
      return NextResponse.json({ results: [], total: 0 })
    }

    // Filter by testament and deduplicate, cap at 100
    const seen = new Set<string>()
    const filtered: typeof words = []
    const bookTestaments: Record<string, string> = {}
    for (const w of words) {
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

    return NextResponse.json({ results: results.filter(Boolean), total: count ?? 0 })
  }

  return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
}
