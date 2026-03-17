import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LastReadTracker from '@/components/LastReadTracker'
import BibleReader from '@/components/BibleReader'
import ChapterAskBanner from '@/components/ChapterAskBanner'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Verse {
  verse: number
  kjv_text: string
  twi_text: string | null
  has_twi: boolean
}

function createSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getChapterData(bookName: string, chapter: number) {
  const supabase = createSupabase()

  const { data: book } = await supabase
    .from('bible_books')
    .select('id, book_name, sort_order')
    .eq('book_name', bookName)
    .single()

  if (!book) return null

  const [versesResult, maxChapterResult, prevBookResult, nextBookResult] = await Promise.all([
    supabase.from('bible_verses').select('verse, kjv_text, twi_text, has_twi').eq('book_id', book.id).eq('chapter', chapter).order('verse'),
    supabase.from('bible_verses').select('chapter').eq('book_id', book.id).order('chapter', { ascending: false }).limit(1).single(),
    supabase.from('bible_books').select('book_name, id').eq('sort_order', book.sort_order - 1).single(),
    supabase.from('bible_books').select('book_name, id').eq('sort_order', book.sort_order + 1).single(),
  ])

  const verses: Verse[] = versesResult.data ?? []
  const maxChapter: number = maxChapterResult.data?.chapter ?? chapter

  let prevBookName: string | null = null
  let prevBookMaxChapter: number | null = null
  if (prevBookResult.data) {
    prevBookName = prevBookResult.data.book_name
    const { data: prevMax } = await supabase.from('bible_verses').select('chapter').eq('book_id', prevBookResult.data.id).order('chapter', { ascending: false }).limit(1).single()
    prevBookMaxChapter = prevMax?.chapter ?? null
  }

  const nextBookName: string | null = nextBookResult.data?.book_name ?? null

  // Fetch Strong's word data
  const { data: wordsRaw } = await supabase
    .from('verse_words')
    .select('verse, word_position, word_text, strongs_number')
    .eq('book', book.book_name)
    .eq('chapter', chapter)
    .order('verse')
    .order('word_position')
    .limit(10000)

  // Collect unique strongs numbers and fetch definitions
  const strongsNums = Array.from(new Set((wordsRaw ?? []).filter(w => w.strongs_number).map(w => w.strongs_number as string)))
  const { data: strongsEntries } = strongsNums.length > 0
    ? await supabase.from('strongs_entries').select('strongs_number, original_word, transliteration, definition').in('strongs_number', strongsNums)
    : { data: [] }

  // Build lookup
  const strongsLookup: Record<string, { original_word: string; transliteration: string | null; definition: string | null }> = {}
  for (const e of (strongsEntries ?? [])) {
    strongsLookup[e.strongs_number] = { original_word: e.original_word, transliteration: e.transliteration, definition: e.definition }
  }

  // Group words by verse
  const verseWords: Record<number, Array<{ word_position: number; word_text: string; strongs_number: string | null }>> = {}
  for (const w of (wordsRaw ?? [])) {
    if (!verseWords[w.verse]) verseWords[w.verse] = []
    verseWords[w.verse].push(w)
  }

  return { book_name: book.book_name, chapter, maxChapter, verses, prevBookName, prevBookMaxChapter, nextBookName, verseWords, strongsLookup }
}

export async function generateMetadata({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params
  const bookName = decodeURIComponent(book)
  return {
    title: `${bookName} ${chapter} — Logos by Kai'Ros`,
    description: `Read ${bookName} chapter ${chapter} in KJV and Asante Twi`,
  }
}

export default async function ChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter: chapterStr } = await params
  const bookName = decodeURIComponent(book)
  const chapter = parseInt(chapterStr, 10)

  if (isNaN(chapter) || chapter < 1) notFound()

  const data = await getChapterData(bookName, chapter)
  if (!data) notFound()

  const { book_name, maxChapter, verses, prevBookName, prevBookMaxChapter, nextBookName, verseWords, strongsLookup } = data
  const hasPrev = chapter > 1
  const hasNext = chapter < maxChapter

  const prevHref = hasPrev
    ? `/bible/${encodeURIComponent(book_name)}/${chapter - 1}`
    : prevBookName && prevBookMaxChapter
      ? `/bible/${encodeURIComponent(prevBookName)}/${prevBookMaxChapter}`
      : null

  const nextHref = hasNext
    ? `/bible/${encodeURIComponent(book_name)}/${chapter + 1}`
    : nextBookName
      ? `/bible/${encodeURIComponent(nextBookName)}/1`
      : null

  return (
    <div style={{ background: 'var(--bg-primary)' }}>
      <LastReadTracker book={book_name} chapter={chapter} />

      {/* Back link */}
      <div className="max-w-[900px] mx-auto px-4 pt-6">
        <Link
          href="/bible"
          className="transition-colors duration-200 hover:text-[var(--gold)]"
          style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}
        >
          &larr; All Books
        </Link>
      </div>

      <BibleReader
        verses={verses}
        bookName={book_name}
        chapter={chapter}
        totalChapters={maxChapter}
        prevHref={prevHref}
        nextHref={nextHref}
        verseWords={verseWords}
        strongsLookup={strongsLookup}
      />

      {/* Ask banner */}
      <div className="max-w-[900px] mx-auto px-4 pb-8">
        <ChapterAskBanner bookName={book_name} chapter={chapter} />
        <p className="mt-6 text-center" style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', letterSpacing: '2px' }}>
          {verses.length} VERSES &middot; LOGOS BY KAI&apos;ROS
        </p>
      </div>
    </div>
  )
}
