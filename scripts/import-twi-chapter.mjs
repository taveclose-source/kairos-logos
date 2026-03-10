/**
 * Import a single chapter's Twi translation into Supabase.
 *
 * Usage:
 *   node scripts/import-twi-chapter.mjs <book> <chapter>
 *
 * Examples:
 *   node scripts/import-twi-chapter.mjs Matthew 9
 *   node scripts/import-twi-chapter.mjs Matthew 15
 *
 * Looks for JSON files in: ../Bible/<book>/<chapter>/
 * Tries these filename patterns in order:
 *   1. <Book><Ch>_Twi_Interlinear_Scaffold_v2.json
 *   2. <Book><Ch>_Twi_Interlinear_Scaffold.json
 *   3. <Book><Ch>_Scaffold.json
 *
 * Outputs SQL UPDATE statements to stdout.
 * Pipe to a file or paste into Supabase SQL editor.
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const book = process.argv[2]
const chapter = parseInt(process.argv[3])

if (!book || !chapter || isNaN(chapter)) {
  console.error('Usage: node scripts/import-twi-chapter.mjs <book> <chapter>')
  console.error('Example: node scripts/import-twi-chapter.mjs Matthew 9')
  process.exit(1)
}

const bibleDir = join(__dirname, '..', '..', 'Bible', book, String(chapter))

// Try multiple filename patterns
const patterns = [
  `${book}${chapter}_Twi_Interlinear_Scaffold_v2.json`,
  `${book}${chapter}_Twi_Interlinear_Scaffold.json`,
  `${book}${chapter}_Scaffold.json`,
]

let filePath = null
for (const pattern of patterns) {
  const candidate = join(bibleDir, pattern)
  if (existsSync(candidate)) {
    filePath = candidate
    break
  }
}

if (!filePath) {
  console.error(`No JSON file found in ${bibleDir}`)
  console.error('Tried:', patterns.join(', '))
  process.exit(1)
}

console.error(`Reading: ${filePath}`)

const raw = readFileSync(filePath, 'utf-8')
const data = JSON.parse(raw)
const verses = data.verses

if (!verses || verses.length === 0) {
  console.error('No verses found in file.')
  process.exit(1)
}

function esc(s) { return s.replace(/'/g, "''") }

const rows = []
for (const v of verses) {
  const verseNum = parseInt(v.ref?.split(':')[1]) || parseInt(v.verse)
  if (!verseNum || !v.twi_text) continue
  rows.push(`(${chapter}, ${verseNum}, '${esc(v.twi_text)}')`)
}

if (rows.length === 0) {
  console.error('No valid verse rows extracted.')
  process.exit(1)
}

console.error(`Found ${rows.length} verses for ${book} chapter ${chapter}`)

// Output SQL
console.log(`-- ${book} chapter ${chapter}: ${rows.length} verses`)
console.log(`-- Source: ${filePath}`)
console.log(`UPDATE bible_verses SET twi_text = v.twi_text, has_twi = true`)
console.log(`FROM (VALUES`)
console.log(rows.join(',\n'))
console.log(`) AS v(chapter, verse, twi_text)`)
console.log(`JOIN bible_books bb ON bb.book_name = '${book}'`)
console.log(`WHERE bible_verses.book_id = bb.id`)
console.log(`AND bible_verses.chapter = v.chapter`)
console.log(`AND bible_verses.verse = v.verse;`)

console.error(`\nSQL written to stdout. Pipe to a file or paste into Supabase SQL editor.`)
console.error(`Example: node scripts/import-twi-chapter.mjs ${book} ${chapter} > ch${chapter}.sql`)
