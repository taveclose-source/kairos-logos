/**
 * Load Philo of Alexandria into Supabase
 * Source: Project Gutenberg, C.D. Yonge translation (public domain)
 * Run: node scripts/load-philo.mjs
 */
import { db, fetchGutenberg, parseIntoSections, loadSections, printSummary } from './historical-shared.mjs'

// Philo's major works — available on Gutenberg in collected volumes
const URLS = [
  { url: 'https://www.gutenberg.org/cache/epub/14564/pg14564.txt', label: 'Philo Vol I' },
  { url: 'https://www.gutenberg.org/cache/epub/14565/pg14565.txt', label: 'Philo Vol II' },
  { url: 'https://www.gutenberg.org/cache/epub/14566/pg14566.txt', label: 'Philo Vol III' },
  { url: 'https://www.gutenberg.org/cache/epub/14567/pg14567.txt', label: 'Philo Vol IV' },
]

// Philo's works span his lifetime (~20 BCE to ~50 CE)
// All set to the same date range since they reflect Hellenistic Jewish thought
// in Alexandria during the Second Temple period
const DEFAULT_META = {
  name: 'Philo of Alexandria',
  start: -20,
  end: 50,
  kingdoms: ['Rome', 'Ptolemaic Egypt'],
  regions: ['Alexandria', 'Egypt', 'Judea'],
}

function detectBook(line) {
  const upper = line.trim().toUpperCase()
  if (upper.length > 120 || upper.length < 5) return null
  // Philo's works have titles like "ON THE CREATION", "ON THE LIFE OF MOSES", etc.
  if (upper.startsWith('ON THE ') || upper.startsWith('ON ') ||
      upper.startsWith('THE ') && upper.includes('OF') && upper.length < 80 ||
      upper.match(/^(?:ALLEGOR|FLACCUS|HYPOTHETICA|EMBASSY|SPECIAL|EVERY|THAT)/)) {
    return null // Don't split on work titles as book numbers — treat as continuous
  }
  const m = upper.match(/^BOOK\s+([IVXLC]+)/)
  if (m) {
    const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5 }
    return romanMap[m[1]] || null
  }
  return null
}

const supabase = db()
let allSections = []
let volNum = 0

for (const { url, label } of URLS) {
  let text
  try {
    text = await fetchGutenberg(url, label)
  } catch {
    console.log(`  Skipping ${label} — not available`)
    continue
  }

  if (text.length < 5000) {
    console.log(`  ${label}: too short (${text.length} chars), skipping`)
    continue
  }

  volNum++
  console.log(`${label}: ${text.length} chars`)

  const bookMeta = {}
  for (let i = 1; i <= 5; i++) {
    bookMeta[i] = { ...DEFAULT_META, name: `Philo Vol ${volNum} Part ${i}` }
  }

  const sections = parseIntoSections(text, {
    sourceName: 'philo',
    defaultBook: 1,
    bookMeta: { 1: { ...DEFAULT_META, name: `Philo Vol ${volNum}` } },
    bookDetector: detectBook,
  })

  // Override book names with volume info
  for (const s of sections) {
    s.book_number = volNum
    s.book_name = `Philo Vol ${volNum}`
  }

  allSections = allSections.concat(sections)
}

if (allSections.length === 0) {
  console.log('No Philo sections parsed from any volume.')
  process.exit(0)
}

await loadSections(supabase, allSections, 'Philo')
printSummary(allSections, 'Philo of Alexandria')
