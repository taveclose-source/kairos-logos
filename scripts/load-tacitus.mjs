/**
 * Load Tacitus — Annals + Histories into Supabase
 * Source: Project Gutenberg, Church & Brodribb translation (public domain)
 * Run: node scripts/load-tacitus.mjs
 */
import { db, fetchGutenberg, parseIntoSections, loadSections, printSummary } from './historical-shared.mjs'

const ANNALS_URL = 'https://www.gutenberg.org/cache/epub/3534/pg3534.txt'

// Annals: 16 books (some fragmentary) covering 14 CE – 68 CE
const ANNALS_META = {
  1:  { name: 'Annals I — Death of Augustus', start: 14, end: 15, kingdoms: ['Rome'], regions: ['Rome', 'Germania'] },
  2:  { name: 'Annals II — Germanicus', start: 16, end: 19, kingdoms: ['Rome'], regions: ['Rome', 'Germania', 'Syria'] },
  3:  { name: 'Annals III — Tiberius', start: 20, end: 22, kingdoms: ['Rome'], regions: ['Rome'] },
  4:  { name: 'Annals IV — Sejanus', start: 23, end: 28, kingdoms: ['Rome'], regions: ['Rome'] },
  5:  { name: 'Annals V — Fall of Sejanus', start: 29, end: 31, kingdoms: ['Rome'], regions: ['Rome'] },
  6:  { name: 'Annals VI — Death of Tiberius', start: 32, end: 37, kingdoms: ['Rome'], regions: ['Rome'] },
  7:  { name: 'Annals VII — [Lost]', start: 37, end: 40, kingdoms: ['Rome'], regions: ['Rome'] },
  8:  { name: 'Annals VIII — [Lost]', start: 40, end: 43, kingdoms: ['Rome'], regions: ['Rome'] },
  9:  { name: 'Annals IX — [Lost]', start: 43, end: 46, kingdoms: ['Rome'], regions: ['Rome'] },
  10: { name: 'Annals X — [Lost]', start: 46, end: 47, kingdoms: ['Rome'], regions: ['Rome'] },
  11: { name: 'Annals XI — Claudius', start: 47, end: 48, kingdoms: ['Rome'], regions: ['Rome', 'Britannia'] },
  12: { name: 'Annals XII — Agrippina', start: 49, end: 54, kingdoms: ['Rome'], regions: ['Rome', 'Britannia', 'Armenia'] },
  13: { name: 'Annals XIII — Early Nero', start: 54, end: 58, kingdoms: ['Rome'], regions: ['Rome', 'Armenia'] },
  14: { name: 'Annals XIV — Nero, Boudicca', start: 59, end: 62, kingdoms: ['Rome'], regions: ['Rome', 'Britannia'] },
  15: { name: 'Annals XV — Fire of Rome, Christians', start: 62, end: 65, kingdoms: ['Rome'], regions: ['Rome', 'Judea'] },
  16: { name: 'Annals XVI — Death of Nero', start: 65, end: 68, kingdoms: ['Rome'], regions: ['Rome'] },
}

// Histories: 5 books covering 69 CE – 96 CE (only 69–70 survive)
const HISTORIES_META = {
  1: { name: 'Histories I — Year of Four Emperors', start: 69, end: 69, kingdoms: ['Rome'], regions: ['Rome', 'Germania'] },
  2: { name: 'Histories II — Vitellius vs Vespasian', start: 69, end: 69, kingdoms: ['Rome'], regions: ['Rome', 'Judea'] },
  3: { name: 'Histories III — Flavian Victory', start: 69, end: 69, kingdoms: ['Rome'], regions: ['Rome'] },
  4: { name: 'Histories IV — Batavian Revolt', start: 70, end: 70, kingdoms: ['Rome'], regions: ['Germania', 'Judea'] },
  5: { name: 'Histories V — Siege of Jerusalem', start: 70, end: 70, kingdoms: ['Rome'], regions: ['Judea', 'Jerusalem'] },
}

function detectBook(line) {
  const upper = line.trim().toUpperCase()
  if (upper.length > 80 || upper.length < 4) return null
  const m = upper.match(/^BOOK\s+(?:THE\s+)?([IVXLC]+)/)
  if (!m) return null
  const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16 }
  return romanMap[m[1]] || null
}

const supabase = db()

let text
try {
  text = await fetchGutenberg(ANNALS_URL, 'Tacitus — Complete Works')
} catch (e) {
  console.error('Failed to fetch Tacitus:', e.message)
  process.exit(1)
}

console.log(`Tacitus text: ${text.length} chars`)

// Split into Annals and Histories portions
const historiesMarker = text.search(/THE\s+HISTORY/i)
let annalsText, historiesText

if (historiesMarker > 0) {
  annalsText = text.slice(0, historiesMarker)
  // Also strip off other works (Agricola, Germania) that may follow Histories
  const agricolaMarker = text.slice(historiesMarker).search(/THE\s+LIFE\s+OF.*?AGRICOLA/i)
  historiesText = agricolaMarker > 0
    ? text.slice(historiesMarker, historiesMarker + agricolaMarker)
    : text.slice(historiesMarker)
} else {
  annalsText = text
  historiesText = ''
}

// Parse Annals
const annalsSections = parseIntoSections(annalsText, {
  sourceName: 'tacitus_annals',
  defaultBook: 1,
  bookMeta: ANNALS_META,
  bookDetector: detectBook,
})

await loadSections(supabase, annalsSections, 'Tacitus Annals')
printSummary(annalsSections, 'Tacitus — Annals')

// Parse Histories
if (historiesText.length > 500) {
  const historiesSections = parseIntoSections(historiesText, {
    sourceName: 'tacitus_histories',
    defaultBook: 1,
    bookMeta: HISTORIES_META,
    bookDetector: detectBook,
  })

  await loadSections(supabase, historiesSections, 'Tacitus Histories')
  printSummary(historiesSections, 'Tacitus — Histories')
  console.log(`\nTotal Tacitus: ${annalsSections.length + historiesSections.length} sections`)
} else {
  console.log('\nHistories text not found in combined volume — Annals only loaded.')
  console.log(`Total Tacitus: ${annalsSections.length} sections`)
}
