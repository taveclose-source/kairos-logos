import { createClient } from '@supabase/supabase-js'

async function getMatthew1() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get Matthew's book ID
  const { data: book } = await supabase
    .from('bible_books')
    .select('id, book_name')
    .eq('book_name', 'Matthew')
    .single()

  if (!book) return { book_name: 'Matthew', verses: [] }

  // Get chapter 1 verses
  const { data: verses } = await supabase
    .from('bible_verses')
    .select('verse, kjv_text, twi_text, has_twi')
    .eq('book_id', book.id)
    .eq('chapter', 1)
    .order('verse')

  return { book_name: book.book_name, verses: verses ?? [] }
}

export default async function BiblePage() {
  const { book_name, verses } = await getMatthew1()

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">{book_name}</h1>
      <h2 className="text-xl text-gray-500 mb-8">Chapter 1</h2>

      <div className="space-y-4 text-lg leading-relaxed">
        {verses.map((v) => (
          <p key={v.verse}>
            <span className="font-semibold text-gray-400 mr-2 text-sm align-super">
              {v.verse}
            </span>
            {v.kjv_text}
          </p>
        ))}
      </div>

      {verses.length === 0 && (
        <p className="text-red-500">No verses found. Check the data pipeline.</p>
      )}

      <p className="mt-12 text-sm text-gray-400">
        {verses.length} verses loaded from Supabase &middot; Logos by Kai&apos;Ros
      </p>
    </main>
  )
}
