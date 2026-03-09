/**
 * Import full KJV Bible into Supabase bible_verses table.
 * Uses public domain KJV JSON from GitHub.
 * Run: node scripts/import-kjv.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xafzgucdwmiwjsupbjbx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhZnpndWNkd21pd2pzdXBiamJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODc4NzYsImV4cCI6MjA4ODY2Mzg3Nn0.wpyZASEp09wM39L4sem2RryMMAsbqNxky_GGuqGL3o8'
)

// Fetch book ID map from Supabase
const { data: books, error: booksErr } = await supabase
  .from('bible_books')
  .select('id, book_name, sort_order')
  .order('sort_order')

if (booksErr) { console.error('Failed to fetch books:', booksErr); process.exit(1) }

const bookMap = {}
for (const b of books) {
  bookMap[b.sort_order] = b.id
}

console.log(`Loaded ${books.length} books from Supabase`)

// Fetch KJV JSON
const KJV_URL = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json'
console.log('Fetching KJV JSON...')
const resp = await fetch(KJV_URL)
const kjvData = await resp.json()
console.log(`Fetched ${kjvData.length} books from KJV JSON`)

// Build verse rows
const rows = []
for (let bookIdx = 0; bookIdx < kjvData.length; bookIdx++) {
  const book = kjvData[bookIdx]
  const bookId = bookMap[bookIdx + 1]
  if (!bookId) {
    console.warn(`No book ID for index ${bookIdx + 1}, skipping`)
    continue
  }
  const chapters = book.chapters
  for (let chIdx = 0; chIdx < chapters.length; chIdx++) {
    const verses = chapters[chIdx]
    for (let vIdx = 0; vIdx < verses.length; vIdx++) {
      rows.push({
        book_id: bookId,
        chapter: chIdx + 1,
        verse: vIdx + 1,
        kjv_text: verses[vIdx],
        twi_text: null,
        has_twi: false
      })
    }
  }
}

console.log(`Prepared ${rows.length} verse rows. Inserting in batches...`)

// Insert in batches of 500
const BATCH = 500
let inserted = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await supabase.from('bible_verses').insert(batch)
  if (error) {
    console.error(`Batch error at row ${i}:`, error)
    process.exit(1)
  }
  inserted += batch.length
  if (inserted % 5000 === 0 || inserted === rows.length) {
    console.log(`  ${inserted} / ${rows.length} inserted`)
  }
}

console.log(`Done! ${inserted} verses imported.`)
