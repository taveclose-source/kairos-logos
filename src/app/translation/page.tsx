import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import GlossaryClient from '@/app/glossary/GlossaryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function createSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface BookProgress {
  book_name: string
  total: number
  translated: number
}

export default async function TranslationPage() {
  const supabase = createSupabase()

  // Fetch live translation counts per NT book
  const { data: progressData } = await supabase.rpc('get_translation_progress')

  // Fallback: direct query if RPC doesn't exist
  let books: BookProgress[] = []
  if (progressData && Array.isArray(progressData)) {
    books = progressData
  } else {
    const { data: bookList } = await supabase
      .from('bible_books')
      .select('id, book_name, sort_order')
      .eq('testament', 'NT')
      .order('sort_order')

    if (bookList) {
      const results = await Promise.all(
        bookList.map(async (b) => {
          const { count: total } = await supabase
            .from('bible_verses')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', b.id)
          const { count: translated } = await supabase
            .from('bible_verses')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', b.id)
            .eq('has_twi', true)
          return {
            book_name: b.book_name,
            total: total ?? 0,
            translated: translated ?? 0,
          }
        })
      )
      books = results
    }
  }

  // Fetch glossary terms
  const { data: glossaryData } = await supabase
    .from('twi_glossary')
    .select('id, kjv_term, twi_term, locked, notes, category, strongs_number, book_introduced')
    .order('category')
    .order('kjv_term')

  const totalVerses = books.reduce((s, b) => s + b.total, 0)
  const translatedVerses = books.reduce((s, b) => s + b.translated, 0)
  const overallPct = totalVerses > 0 ? Math.round((translatedVerses / totalVerses) * 100) : 0

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link
        href="/"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        &larr; Home
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-1">
        Asante Twi Translation
      </h1>
      <p className="text-gray-500 mb-8">
        KJV &rarr; Asante Twi &middot; Anchored to the Textus Receptus
      </p>

      {/* Overall progress */}
      <div className="rounded-xl border border-gray-200 p-5 mb-8">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">New Testament Progress</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {translatedVerses.toLocaleString()} of {totalVerses.toLocaleString()} verses translated
            </p>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {overallPct}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Book list */}
      <div className="space-y-3 mb-12">
        {books.map((book) => {
          const pct = book.total > 0 ? Math.round((book.translated / book.total) * 100) : 0
          const barColor = pct === 100
            ? 'bg-emerald-500'
            : pct > 0
              ? 'bg-amber-400'
              : 'bg-gray-200'
          const dotColor = barColor
          const label = pct === 100 ? 'Complete' : pct > 0 ? 'In progress' : 'Coming'

          return (
            <div key={book.book_name} className="rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
                  <span className="text-sm font-medium text-gray-800">{book.book_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {book.translated}/{book.total} verses
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide w-20 text-right">
                    {label}
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Source info */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 mb-12">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">About This Translation</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          Every verse is translated from the Scrivener 1894 Textus Receptus Greek text,
          using the King James Bible as the English benchmark. The locked Asante Twi glossary
          ensures theological terms remain consistent across the entire project.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          This is not a paraphrase or dynamic equivalence translation. It is a formal
          equivalence rendering anchored to the preserved text &mdash; word for word,
          verse by verse.
        </p>
      </div>

      {/* Glossary section */}
      <div id="glossary">
        <h2 className="text-2xl font-bold mb-1">Translation Glossary</h2>
        <p className="text-gray-500 text-sm mb-6">
          Locked terms governing all Asante Twi translations
        </p>
        <GlossaryClient terms={glossaryData ?? []} />
      </div>

      <p className="mt-10 text-xs text-gray-400 text-center">
        Logos by Kai&apos;Ros &middot; Kai&apos;Ros International &middot; Summit Bible Center
      </p>
    </main>
  )
}
