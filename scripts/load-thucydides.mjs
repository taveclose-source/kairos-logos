/**
 * Load Thucydides — History of the Peloponnesian War into Supabase
 * Source: Project Gutenberg, Richard Crawley translation (public domain)
 * Run: node scripts/load-thucydides.mjs
 */
import { db, fetchGutenberg, parseIntoSections, loadSections, printSummary } from './historical-shared.mjs'

const URL = 'https://www.gutenberg.org/cache/epub/7142/pg7142.txt'

// 8 books covering 431–404 BCE (intertestamental period / "400 silent years")
const BOOK_META = {
  1: { name: 'Thucydides I — Causes of the War', start: -460, end: -431, kingdoms: ['Athens', 'Sparta', 'Corinth'], regions: ['Greece', 'Aegean'] },
  2: { name: 'Thucydides II — First Years', start: -431, end: -428, kingdoms: ['Athens', 'Sparta', 'Thebes'], regions: ['Attica', 'Peloponnese'] },
  3: { name: 'Thucydides III — Revolt of Mytilene', start: -428, end: -425, kingdoms: ['Athens', 'Sparta'], regions: ['Lesbos', 'Corcyra'] },
  4: { name: 'Thucydides IV — Pylos and Sphacteria', start: -425, end: -422, kingdoms: ['Athens', 'Sparta'], regions: ['Pylos', 'Thrace', 'Sicily'] },
  5: { name: 'Thucydides V — Peace of Nicias', start: -422, end: -415, kingdoms: ['Athens', 'Sparta', 'Argos'], regions: ['Greece', 'Melos'] },
  6: { name: 'Thucydides VI — Sicilian Expedition', start: -415, end: -413, kingdoms: ['Athens', 'Syracuse'], regions: ['Sicily', 'Athens'] },
  7: { name: 'Thucydides VII — Sicilian Disaster', start: -413, end: -413, kingdoms: ['Athens', 'Syracuse', 'Sparta'], regions: ['Sicily'] },
  8: { name: 'Thucydides VIII — Ionian War', start: -413, end: -404, kingdoms: ['Athens', 'Sparta', 'Persia'], regions: ['Ionia', 'Hellespont', 'Aegean'] },
}

function detectBook(line) {
  const upper = line.trim().toUpperCase()
  if (upper.length > 80 || upper.length < 4) return null
  // Patterns: "BOOK I", "SECOND BOOK", "THE FIRST BOOK", "CHAPTER I" at book level
  const m = upper.match(/^(?:THE\s+)?(?:FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH)\s+BOOK/) ||
            upper.match(/^BOOK\s+([IVXLC]+)/)
  if (!m) return null

  const wordMap = { 'FIRST': 1, 'SECOND': 2, 'THIRD': 3, 'FOURTH': 4, 'FIFTH': 5, 'SIXTH': 6, 'SEVENTH': 7, 'EIGHTH': 8 }
  for (const [word, num] of Object.entries(wordMap)) {
    if (upper.includes(word)) return num
  }

  const romanMatch = upper.match(/BOOK\s+([IVXLC]+)/)
  if (romanMatch) {
    const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8 }
    return romanMap[romanMatch[1]] || null
  }
  return null
}

const supabase = db()

let text
try {
  text = await fetchGutenberg(URL, 'Thucydides — History of the Peloponnesian War')
} catch (e) {
  console.error('Failed to fetch Thucydides:', e.message)
  process.exit(1)
}

console.log(`Thucydides: ${text.length} chars`)

const sections = parseIntoSections(text, {
  sourceName: 'thucydides',
  defaultBook: 1,
  bookMeta: BOOK_META,
  bookDetector: detectBook,
})

await loadSections(supabase, sections, 'Thucydides')
printSummary(sections, 'Thucydides — History of the Peloponnesian War')
