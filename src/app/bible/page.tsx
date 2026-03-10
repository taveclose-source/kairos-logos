import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface BookInfo {
  id: string
  book_name: string
  testament: string
  sort_order: number
  total_chapters: number
  twi_chapters: number[]
}

async function getBooks(): Promise<BookInfo[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get all books
  const { data: books } = await supabase
    .from('bible_books')
    .select('id, book_name, testament, sort_order')
    .order('sort_order')

  if (!books) return []

  // Get chapter counts and Twi availability per book
  const { data: chapterData } = await supabase
    .from('bible_verses')
    .select('book_id, chapter, has_twi')

  // Aggregate chapter info
  const chapterMap: Record<string, { chapters: Set<number>; twiChapters: Set<number> }> = {}
  for (const row of chapterData ?? []) {
    if (!chapterMap[row.book_id]) {
      chapterMap[row.book_id] = { chapters: new Set(), twiChapters: new Set() }
    }
    chapterMap[row.book_id].chapters.add(row.chapter)
    if (row.has_twi) {
      chapterMap[row.book_id].twiChapters.add(row.chapter)
    }
  }

  return books.map((b) => ({
    id: b.id,
    book_name: b.book_name,
    testament: b.testament,
    sort_order: b.sort_order,
    total_chapters: chapterMap[b.id]?.chapters.size ?? 0,
    twi_chapters: Array.from(chapterMap[b.id]?.twiChapters ?? []).sort((a, c) => a - c),
  }))
}

export default async function BiblePage() {
  const books = await getBooks()
  const otBooks = books.filter((b) => b.testament === 'OT')
  const ntBooks = books.filter((b) => b.testament === 'NT')

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link
        href="/"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        &larr; Home
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-1">Bible</h1>
      <p className="text-gray-500 mb-8">
        KJV &amp; Asante Twi &middot; Select a book to begin reading
      </p>

      <div className="mb-4 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Twi available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300" />
          Translation coming
        </span>
      </div>

      <BookSection title="Old Testament" books={otBooks} />
      <BookSection title="New Testament" books={ntBooks} />

      <p className="mt-12 text-sm text-gray-400 text-center">
        66 books &middot; Logos by Kai&apos;Ros
      </p>
    </main>
  )
}

function BookSection({ title, books }: { title: string; books: BookInfo[] }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-gray-600 mb-4 border-b pb-2">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  )
}

function BookCard({ book }: { book: BookInfo }) {
  const hasTwi = book.twi_chapters.length > 0
  const chapters = Array.from({ length: book.total_chapters }, (_, i) => i + 1)

  return (
    <details className="group rounded-xl border border-gray-200 overflow-hidden">
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              hasTwi ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          />
          <span className="font-medium text-sm">{book.book_name}</span>
        </div>
        <span className="text-xs text-gray-400">
          {book.total_chapters} ch
          {hasTwi && (
            <span className="ml-1 text-emerald-600">
              &middot; {book.twi_chapters.length} Twi
            </span>
          )}
        </span>
      </summary>
      <div className="px-4 pb-3 pt-1 border-t border-gray-100">
        <div className="flex flex-wrap gap-1.5">
          {chapters.map((ch) => {
            const chHasTwi = book.twi_chapters.includes(ch)
            return (
              <Link
                key={ch}
                href={`/bible/${encodeURIComponent(book.book_name)}/${ch}`}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                  chHasTwi
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {ch}
              </Link>
            )
          })}
        </div>
      </div>
    </details>
  )
}
