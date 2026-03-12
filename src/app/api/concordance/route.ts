import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function createSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// GET /api/concordance?type=strongs&number=G26
// GET /api/concordance?type=english&word=love&testament=NT
// GET /api/concordance?type=verse&book=John&chapter=3&verse=16
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  const supabase = createSupabase()

  if (type === 'strongs') {
    const number = searchParams.get('number')
    if (!number) return NextResponse.json({ error: 'number required' }, { status: 400 })

    // Find all verses containing this Strong's number
    const { data: wordRows, error } = await supabase
      .from('verse_words')
      .select('book, chapter, verse, word_text')
      .eq('strongs_number', number)
      .order('book')
      .order('chapter')
      .order('verse')
      .limit(5000)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Deduplicate by book/chapter/verse (a word may appear multiple times in a verse)
    const seen = new Set<string>()
    const unique = (wordRows ?? []).filter(r => {
      const key = `${r.book}|${r.chapter}|${r.verse}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Get book testament info for grouping
    const bookNames = Array.from(new Set(unique.map(r => r.book)))
    const { data: books } = await supabase
      .from('bible_books')
      .select('book_name, testament, sort_order')
      .in('book_name', bookNames)

    const bookLookup: Record<string, { testament: string; sort_order: number }> = {}
    for (const b of books ?? []) {
      bookLookup[b.book_name] = { testament: b.testament, sort_order: b.sort_order }
    }

    // Get verse text previews
    const verseLookup: Record<string, string> = {}

    // Fetch in batches by book to avoid overly complex queries
    for (const bookName of bookNames) {
      const bookVerses = unique.filter(r => r.book === bookName)
      const chapters = Array.from(new Set(bookVerses.map(r => r.chapter)))

      const { data: bookInfo } = await supabase
        .from('bible_books')
        .select('id')
        .eq('book_name', bookName)
        .single()

      if (!bookInfo) continue

      const { data: verseTexts } = await supabase
        .from('bible_verses')
        .select('chapter, verse, kjv_text')
        .eq('book_id', bookInfo.id)
        .in('chapter', chapters)
        .limit(5000)

      for (const vt of verseTexts ?? []) {
        verseLookup[`${bookName}|${vt.chapter}|${vt.verse}`] = vt.kjv_text
      }
    }

    // Build response grouped by testament
    const results = unique.map(r => {
      const info = bookLookup[r.book]
      const fullText = verseLookup[`${r.book}|${r.chapter}|${r.verse}`] ?? ''
      // Preview: first ~60 chars
      const clean = fullText.replace(/\s*\{[^}]*\}\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
      const preview = clean.length > 60 ? clean.slice(0, 60) + '...' : clean
      return {
        book: r.book,
        chapter: r.chapter,
        verse: r.verse,
        testament: info?.testament ?? 'NT',
        sort_order: info?.sort_order ?? 0,
        preview,
        english_word: r.word_text,
      }
    })

    // Sort by canonical order
    results.sort((a, b) => a.sort_order - b.sort_order || a.chapter - b.chapter || a.verse - b.verse)

    return NextResponse.json({ results, total: results.length })
  }

  if (type === 'english') {
    const word = searchParams.get('word')
    const testament = searchParams.get('testament') // 'OT' or 'NT'
    if (!word) return NextResponse.json({ error: 'word required' }, { status: 400 })

    // Get books in the specified testament
    const query = supabase
      .from('bible_books')
      .select('book_name, testament, sort_order')

    if (testament) {
      query.eq('testament', testament)
    }

    const { data: books } = await query
    if (!books || books.length === 0) return NextResponse.json({ results: [], total: 0 })

    const bookNames = books.map(b => b.book_name)
    const bookLookup: Record<string, { testament: string; sort_order: number }> = {}
    for (const b of books) {
      bookLookup[b.book_name] = { testament: b.testament, sort_order: b.sort_order }
    }

    // Search verse_words for exact word match (case-insensitive via ilike)
    // We search with word boundaries by matching the raw word text
    const { data: wordRows, error } = await supabase
      .from('verse_words')
      .select('book, chapter, verse, word_text')
      .ilike('word_text', word)
      .in('book', bookNames)
      .order('book')
      .order('chapter')
      .order('verse')
      .limit(5000)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Deduplicate by book/chapter/verse
    const seen = new Set<string>()
    const unique = (wordRows ?? []).filter(r => {
      const key = `${r.book}|${r.chapter}|${r.verse}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Get verse text previews (batch by book)
    const verseLookup: Record<string, string> = {}
    const uniqueBooks = Array.from(new Set(unique.map(r => r.book)))

    for (const bookName of uniqueBooks) {
      const bookVerses = unique.filter(r => r.book === bookName)
      const chapters = Array.from(new Set(bookVerses.map(r => r.chapter)))

      const { data: bookInfo } = await supabase
        .from('bible_books')
        .select('id')
        .eq('book_name', bookName)
        .single()

      if (!bookInfo) continue

      const { data: verseTexts } = await supabase
        .from('bible_verses')
        .select('chapter, verse, kjv_text')
        .eq('book_id', bookInfo.id)
        .in('chapter', chapters)
        .limit(5000)

      for (const vt of verseTexts ?? []) {
        verseLookup[`${bookName}|${vt.chapter}|${vt.verse}`] = vt.kjv_text
      }
    }

    const results = unique.map(r => {
      const info = bookLookup[r.book]
      const fullText = verseLookup[`${r.book}|${r.chapter}|${r.verse}`] ?? ''
      const clean = fullText.replace(/\s*\{[^}]*\}\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
      const preview = clean.length > 60 ? clean.slice(0, 60) + '...' : clean
      return {
        book: r.book,
        chapter: r.chapter,
        verse: r.verse,
        testament: info?.testament ?? testament ?? 'NT',
        sort_order: info?.sort_order ?? 0,
        preview,
      }
    })

    results.sort((a, b) => a.sort_order - b.sort_order || a.chapter - b.chapter || a.verse - b.verse)

    return NextResponse.json({ results, total: results.length })
  }

  if (type === 'verse') {
    const book = searchParams.get('book')
    const chapter = parseInt(searchParams.get('chapter') ?? '0', 10)
    const verse = parseInt(searchParams.get('verse') ?? '0', 10)
    if (!book || !chapter || !verse) {
      return NextResponse.json({ error: 'book, chapter, verse required' }, { status: 400 })
    }

    // Get verse text
    const { data: bookInfo } = await supabase
      .from('bible_books')
      .select('id, testament')
      .eq('book_name', book)
      .single()

    if (!bookInfo) return NextResponse.json({ error: 'book not found' }, { status: 404 })

    const { data: verseData } = await supabase
      .from('bible_verses')
      .select('kjv_text')
      .eq('book_id', bookInfo.id)
      .eq('chapter', chapter)
      .eq('verse', verse)
      .single()

    // Get words with Strong's data
    const { data: words } = await supabase
      .from('verse_words')
      .select('word_position, word_text, strongs_number')
      .eq('book', book)
      .eq('chapter', chapter)
      .eq('verse', verse)
      .order('word_position')

    // Get Strong's entries for those words
    const strongsNums = Array.from(new Set(
      (words ?? []).filter(w => w.strongs_number).map(w => w.strongs_number as string)
    ))

    const { data: strongsData } = strongsNums.length > 0
      ? await supabase
          .from('strongs_entries')
          .select('strongs_number, testament, original_word, transliteration, pronunciation, part_of_speech, definition, kjv_usage')
          .in('strongs_number', strongsNums)
      : { data: [] }

    interface StrongsEntry {
      strongs_number: string
      testament: string
      original_word: string | null
      transliteration: string | null
      pronunciation: string | null
      part_of_speech: string | null
      definition: string | null
      kjv_usage: string | null
    }

    const strongsLookup: Record<string, StrongsEntry> = {}
    for (const se of (strongsData ?? []) as StrongsEntry[]) {
      strongsLookup[se.strongs_number] = se
    }

    const enrichedWords = (words ?? []).map(w => {
      const se = w.strongs_number ? strongsLookup[w.strongs_number] : null
      return {
        word_position: w.word_position,
        word_text: w.word_text,
        strongs_number: w.strongs_number,
        testament: se?.testament ?? bookInfo.testament,
        original_word: se?.original_word ?? null,
        transliteration: se?.transliteration ?? null,
        pronunciation: se?.pronunciation ?? null,
        part_of_speech: se?.part_of_speech ?? null,
        definition: se?.definition ?? null,
        kjv_usage: se?.kjv_usage ?? null,
      }
    })

    return NextResponse.json({
      book,
      chapter,
      verse,
      testament: bookInfo.testament,
      kjv_text: verseData?.kjv_text ?? '',
      words: enrichedWords,
    })
  }

  return NextResponse.json({ error: 'type must be strongs, english, or verse' }, { status: 400 })
}
