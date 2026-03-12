import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LastReadTracker from '@/components/LastReadTracker'
import VerseDisplay from '@/components/VerseDisplay'
import ChapterSideArrows from '@/components/ChapterSideArrows'

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

  // Get book record
  const { data: book } = await supabase
    .from('bible_books')
    .select('id, book_name, sort_order')
    .eq('book_name', bookName)
    .single()

  if (!book) return null

  // Fetch verses, max chapter, and adjacent books in parallel
  const [versesResult, maxChapterResult, prevBookResult, nextBookResult] = await Promise.all([
    supabase
      .from('bible_verses')
      .select('verse, kjv_text, twi_text, has_twi')
      .eq('book_id', book.id)
      .eq('chapter', chapter)
      .order('verse'),
    supabase
      .from('bible_verses')
      .select('chapter')
      .eq('book_id', book.id)
      .order('chapter', { ascending: false })
      .limit(1)
      .single(),
    // Previous book (for navigating back from chapter 1)
    supabase
      .from('bible_books')
      .select('book_name, id')
      .eq('sort_order', book.sort_order - 1)
      .single(),
    // Next book (for navigating forward from last chapter)
    supabase
      .from('bible_books')
      .select('book_name, id')
      .eq('sort_order', book.sort_order + 1)
      .single(),
  ])

  const verses: Verse[] = versesResult.data ?? []
  const maxChapter: number = maxChapterResult.data?.chapter ?? chapter

  // Get max chapter of previous book if it exists
  let prevBookName: string | null = null
  let prevBookMaxChapter: number | null = null
  if (prevBookResult.data) {
    prevBookName = prevBookResult.data.book_name
    const { data: prevMax } = await supabase
      .from('bible_verses')
      .select('chapter')
      .eq('book_id', prevBookResult.data.id)
      .order('chapter', { ascending: false })
      .limit(1)
      .single()
    prevBookMaxChapter = prevMax?.chapter ?? null
  }

  const nextBookName: string | null = nextBookResult.data?.book_name ?? null

  return {
    book_name: book.book_name,
    chapter,
    maxChapter,
    verses,
    prevBookName,
    prevBookMaxChapter,
    nextBookName,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>
}) {
  const { book, chapter } = await params
  const bookName = decodeURIComponent(book)
  return {
    title: `${bookName} ${chapter} — Logos by Kai'Ros`,
    description: `Read ${bookName} chapter ${chapter} in KJV and Asante Twi`,
  }
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>
}) {
  const { book, chapter: chapterStr } = await params
  const bookName = decodeURIComponent(book)
  const chapter = parseInt(chapterStr, 10)

  if (isNaN(chapter) || chapter < 1) {
    notFound()
  }

  const data = await getChapterData(bookName, chapter)

  if (!data) {
    notFound()
  }

  const { book_name, maxChapter, verses, prevBookName, prevBookMaxChapter, nextBookName } = data
  const hasPrev = chapter > 1
  const hasNext = chapter < maxChapter
  const chapterHasTwi = verses.some((v) => v.twi_text !== null)

  // Side arrow hrefs: within-book first, then cross-book
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

  const chapterNav = (
    <nav className="flex items-center justify-between">
      {hasPrev ? (
        <Link
          href={`/bible/${encodeURIComponent(book_name)}/${chapter - 1}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          &larr; Chapter {chapter - 1}
        </Link>
      ) : (
        <span />
      )}

      <span className="text-sm text-gray-400">
        {chapter} of {maxChapter}
      </span>

      {hasNext ? (
        <Link
          href={`/bible/${encodeURIComponent(book_name)}/${chapter + 1}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Chapter {chapter + 1} &rarr;
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <LastReadTracker book={book_name} chapter={chapter} />
      <ChapterSideArrows prevHref={prevHref} nextHref={nextHref} />

      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <Link
          href="/bible"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          &larr; All Books
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mt-2">{book_name}</h1>
        <h2 className="text-xl text-gray-500">Chapter {chapter}</h2>
      </div>

      {/* Top chapter selector */}
      <div className="mb-6 pb-4 border-b border-gray-100">
        {chapterNav}
      </div>

      <VerseDisplay verses={verses} chapterHasTwi={chapterHasTwi} bookName={book_name} chapter={chapter} />

      {/* Bottom chapter selector */}
      <div className="mt-10 pt-6 border-t">
        {chapterNav}
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-gray-400 text-center">
        {verses.length} verses &middot; Logos by Kai&apos;Ros
      </p>
    </main>
  )
}
