/**
 * Load Eusebius — Ecclesiastical History into Supabase
 * Source: Project Gutenberg, various translations (public domain)
 * Run: node scripts/load-eusebius.mjs
 */
import { db, fetchGutenberg, parseIntoSections, loadSections, printSummary } from './historical-shared.mjs'

// Eusebius Church History — Cruse translation or McGiffert/Schaff
// Try multiple Gutenberg IDs
const URLS = [
  'https://www.gutenberg.org/cache/epub/35625/pg35625.txt',
  'https://www.gutenberg.org/cache/epub/46822/pg46822.txt',
]

// Alternate: CCEL (Christian Classics Ethereal Library)
const CCEL_URL = 'https://ccel.org/ccel/schaff/npnf201/npnf201.txt'

// 10 books covering ~1 CE to 324 CE
const BOOK_META = {
  1:  { name: 'Eusebius I — Christ and the Apostles', start: -5, end: 30, kingdoms: ['Rome', 'Herodian'], regions: ['Judea', 'Galilee'] },
  2:  { name: 'Eusebius II — Apostolic Age', start: 30, end: 70, kingdoms: ['Rome'], regions: ['Judea', 'Rome', 'Asia Minor'] },
  3:  { name: 'Eusebius III — Post-Apostolic', start: 70, end: 117, kingdoms: ['Rome'], regions: ['Rome', 'Asia Minor', 'Alexandria'] },
  4:  { name: 'Eusebius IV — Hadrian to Marcus Aurelius', start: 117, end: 180, kingdoms: ['Rome'], regions: ['Rome', 'Palestine', 'Alexandria'] },
  5:  { name: 'Eusebius V — Martyrdoms', start: 180, end: 211, kingdoms: ['Rome'], regions: ['Gaul', 'Rome', 'Palestine'] },
  6:  { name: 'Eusebius VI — Origen', start: 211, end: 249, kingdoms: ['Rome'], regions: ['Alexandria', 'Caesarea', 'Rome'] },
  7:  { name: 'Eusebius VII — Valerian Persecution', start: 249, end: 284, kingdoms: ['Rome'], regions: ['Rome', 'Alexandria', 'Asia Minor'] },
  8:  { name: 'Eusebius VIII — Great Persecution', start: 284, end: 311, kingdoms: ['Rome'], regions: ['Rome', 'Palestine', 'Egypt'] },
  9:  { name: 'Eusebius IX — Edict of Toleration', start: 311, end: 313, kingdoms: ['Rome'], regions: ['Rome'] },
  10: { name: 'Eusebius X — Constantine', start: 313, end: 324, kingdoms: ['Rome'], regions: ['Rome', 'Constantinople'] },
}

function detectBook(line) {
  const upper = line.trim().toUpperCase()
  if (upper.length > 100 || upper.length < 4) return null
  const m = upper.match(/BOOK\s+([IVXLC]+)/)
  if (!m) return null
  const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10 }
  return romanMap[m[1]] || null
}

const supabase = db()

let text = null
for (const url of URLS) {
  try {
    text = await fetchGutenberg(url, `Eusebius (${url})`)
    if (text.length > 10000) break
    text = null
  } catch {
    console.log(`  URL not available: ${url}`)
  }
}

// Fallback: try CCEL
if (!text) {
  try {
    console.log('Trying CCEL source...')
    const resp = await fetch(CCEL_URL)
    if (resp.ok) {
      text = await resp.text()
      if (text.length < 10000) text = null
    }
  } catch {
    console.log('  CCEL not available')
  }
}

if (!text) {
  console.error('Could not fetch Eusebius from any source. Skipping.')
  process.exit(0)
}

console.log(`Eusebius: ${text.length} chars`)

const sections = parseIntoSections(text, {
  sourceName: 'eusebius',
  defaultBook: 1,
  bookMeta: BOOK_META,
  bookDetector: detectBook,
})

if (sections.length === 0) {
  console.log('No sections parsed — text format may not match expected structure.')
  process.exit(0)
}

await loadSections(supabase, sections, 'Eusebius')
printSummary(sections, 'Eusebius — Ecclesiastical History')
