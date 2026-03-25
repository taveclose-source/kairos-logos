/**
 * Load Herodotus' Histories into Supabase (Tier 4 — Historical Context)
 * Source: Project Gutenberg, Macaulay translation (public domain)
 * Run: node scripts/load-herodotus.mjs
 *
 * Per Design Doctrine: all Tier 4 content carries authority notice.
 * Agent responses drawing from this data MUST be flagged as historical context.
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VOL1_URL = 'https://www.gutenberg.org/cache/epub/2707/pg2707.txt'
const VOL2_URL = 'https://www.gutenberg.org/cache/epub/2456/pg2456.txt'

// The nine books of Herodotus and their traditional names
const BOOK_NAMES = {
  1: 'Clio',
  2: 'Euterpe',
  3: 'Thalia',
  4: 'Melpomene',
  5: 'Terpsichore',
  6: 'Erato',
  7: 'Polymnia',
  8: 'Urania',
  9: 'Calliope'
}

// Approximate date ranges for each book's primary subject matter (BCE, stored as negative)
const BOOK_DATES = {
  1: { start: -560, end: -546, kingdoms: ['Lydia', 'Persia', 'Media', 'Babylon'] },
  2: { start: -664, end: -525, kingdoms: ['Egypt'] },
  3: { start: -530, end: -522, kingdoms: ['Persia', 'Egypt', 'Babylon', 'Samos'] },
  4: { start: -513, end: -510, kingdoms: ['Scythia', 'Libya', 'Persia'] },
  5: { start: -510, end: -494, kingdoms: ['Ionia', 'Persia', 'Athens', 'Sparta'] },
  6: { start: -494, end: -490, kingdoms: ['Persia', 'Athens', 'Sparta', 'Greece'] },
  7: { start: -486, end: -480, kingdoms: ['Persia', 'Greece', 'Sparta', 'Athens'] },
  8: { start: -480, end: -480, kingdoms: ['Persia', 'Greece', 'Athens'] },
  9: { start: -479, end: -479, kingdoms: ['Persia', 'Greece', 'Sparta', 'Athens'] }
}

// Key proper nouns that connect to Biblical narrative
const BIBLICAL_NOUNS = new Set([
  'Cyrus', 'Darius', 'Xerxes', 'Babylon', 'Babylonians', 'Jerusalem',
  'Egypt', 'Egyptians', 'Pharaoh', 'Necho', 'Nebuchadnezzar',
  'Phoenicia', 'Phoenicians', 'Tyre', 'Sidon', 'Syria', 'Assyria',
  'Assyrians', 'Nineveh', 'Persia', 'Persians', 'Media', 'Medes',
  'Jews', 'Judaea', 'Palestine', 'Philistines', 'Ethiopia',
  'Ethiopians', 'Arabia', 'Arabians', 'Cambyses', 'Artaxerxes',
  'Susa', 'Shushan', 'Elam', 'Cush', 'Libya', 'Red Sea',
  'Euphrates', 'Tigris', 'Nile', 'Memphis', 'Thebes'
])

// Scripture connections for key figures/places
const SCRIPTURE_MAP = {
  'Cyrus': ['Isaiah 44:28', 'Isaiah 45:1', 'Ezra 1:1-4', '2 Chronicles 36:22-23', 'Daniel 6:28', 'Daniel 10:1'],
  'Darius': ['Daniel 6:1', 'Ezra 6:1', 'Haggai 1:1', 'Zechariah 1:1'],
  'Xerxes': ['Esther 1:1', 'Ezra 4:6'],
  'Babylon': ['Daniel 1:1', 'Jeremiah 50:1', '2 Kings 24:1', 'Isaiah 13:1'],
  'Nebuchadnezzar': ['Daniel 1:1', '2 Kings 24:1', 'Jeremiah 25:1'],
  'Egypt': ['Genesis 12:10', 'Exodus 1:1', 'Isaiah 19:1', 'Jeremiah 46:2'],
  'Necho': ['2 Kings 23:29', '2 Chronicles 35:20-22', 'Jeremiah 46:2'],
  'Jerusalem': ['2 Kings 25:1', 'Ezra 1:2', 'Nehemiah 2:17', 'Daniel 9:25'],
  'Tyre': ['Ezekiel 26:1-7', 'Isaiah 23:1'],
  'Sidon': ['Ezekiel 28:21-22', 'Joel 3:4'],
  'Nineveh': ['Nahum 1:1', 'Jonah 1:2', 'Zephaniah 2:13'],
  'Susa': ['Nehemiah 1:1', 'Esther 1:2', 'Daniel 8:2'],
  'Euphrates': ['Genesis 2:14', 'Revelation 9:14'],
  'Red Sea': ['Exodus 14:21-22', 'Exodus 15:4']
}

function extractProperNouns(text) {
  const nouns = new Set()
  for (const noun of BIBLICAL_NOUNS) {
    if (text.includes(noun)) nouns.add(noun)
  }
  return nouns.size > 0 ? [...nouns] : null
}

function getScriptureConnections(properNouns) {
  if (!properNouns) return null
  const refs = new Set()
  for (const noun of properNouns) {
    if (SCRIPTURE_MAP[noun]) {
      SCRIPTURE_MAP[noun].forEach(r => refs.add(r))
    }
  }
  return refs.size > 0 ? [...refs] : null
}

async function fetchAndParse(url, label) {
  console.log(`Fetching ${label}...`)
  const resp = await fetch(url)
  const text = await resp.text()

  // Strip Project Gutenberg header and footer
  const startMarker = /\*\*\*\s*START OF.*?\*\*\*/i
  const endMarker = /\*\*\*\s*END OF.*?\*\*\*/i

  const startMatch = text.match(startMarker)
  const endMatch = text.match(endMarker)

  let content = text
  if (startMatch) content = content.slice(startMatch.index + startMatch[0].length)
  if (endMatch) content = content.slice(0, content.search(endMarker))

  return content.trim()
}

// Parse text into book/chapter sections
function parseIntoSections(text, volumeBooks) {
  const sections = []

  // Split by book headers — look for patterns like "THE FIRST BOOK", "BOOK I", "CLIO", etc.
  const bookPatterns = [
    /(?:THE\s+)?(?:FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH)\s+BOOK/gi,
    /BOOK\s+[IVX]+/gi,
    /\b(?:CLIO|EUTERPE|THALIA|MELPOMENE|TERPSICHORE|ERATO|POLYMNIA|URANIA|CALLIOPE)\b/gi
  ]

  // Simple approach: split into ~100-line chunks per book
  const lines = text.split('\n')
  let currentBook = volumeBooks[0]
  let chunkLines = []
  let chapterNum = 1

  const bookKeywords = {
    'CLIO': 1, 'EUTERPE': 2, 'THALIA': 3, 'MELPOMENE': 4,
    'TERPSICHORE': 5, 'ERATO': 6, 'POLYMNIA': 7, 'URANIA': 8, 'CALLIOPE': 9,
    'FIRST BOOK': 1, 'SECOND BOOK': 2, 'THIRD BOOK': 3, 'FOURTH BOOK': 4,
    'FIFTH BOOK': 5, 'SIXTH BOOK': 6, 'SEVENTH BOOK': 7, 'EIGHTH BOOK': 8, 'NINTH BOOK': 9
  }

  function flushChunk() {
    const content = chunkLines.join('\n').trim()
    if (content.length < 50) return // skip trivially short

    const nouns = extractProperNouns(content)
    const scripRefs = getScriptureConnections(nouns)
    const dates = BOOK_DATES[currentBook] || {}

    sections.push({
      book_number: currentBook,
      book_name: BOOK_NAMES[currentBook],
      chapter: chapterNum,
      content,
      proper_nouns: nouns,
      scripture_connections: scripRefs,
      kingdoms: dates.kingdoms || null,
      date_range_start: dates.start || null,
      date_range_end: dates.end || null,
      source_tier: 4,
      authority_notice: 'Historical context only — not theological authority. The Bible interprets history.'
    })
    chapterNum++
    chunkLines = []
  }

  for (const line of lines) {
    const upper = line.trim().toUpperCase()

    // Detect book transitions
    let newBook = null
    for (const [keyword, bookNum] of Object.entries(bookKeywords)) {
      if (upper.includes(keyword) && volumeBooks.includes(bookNum) && upper.length < 80) {
        newBook = bookNum
        break
      }
    }

    if (newBook && newBook !== currentBook) {
      flushChunk()
      currentBook = newBook
      chapterNum = 1
      continue
    }

    chunkLines.push(line)

    // Split into sections of ~80 lines (roughly paragraph-sized passages)
    if (chunkLines.length >= 80) {
      // Try to break at a paragraph boundary
      let breakIdx = chunkLines.length
      for (let j = chunkLines.length - 1; j >= 60; j--) {
        if (chunkLines[j].trim() === '') {
          breakIdx = j
          break
        }
      }
      const flushing = chunkLines.slice(0, breakIdx)
      chunkLines = chunkLines.slice(breakIdx)

      const tempLines = chunkLines
      chunkLines = flushing
      flushChunk()
      chunkLines = tempLines
    }
  }

  flushChunk()
  return sections
}

// Fetch both volumes
const [vol1Text, vol2Text] = await Promise.all([
  fetchAndParse(VOL1_URL, 'Volume 1 (Books I-IV)'),
  fetchAndParse(VOL2_URL, 'Volume 2 (Books V-IX)')
])

console.log(`Vol 1: ${vol1Text.length} chars, Vol 2: ${vol2Text.length} chars`)

const vol1Sections = parseIntoSections(vol1Text, [1, 2, 3, 4])
const vol2Sections = parseIntoSections(vol2Text, [5, 6, 7, 8, 9])
const allSections = [...vol1Sections, ...vol2Sections]

console.log(`Parsed ${allSections.length} sections across 9 books. Loading...`)

const BATCH = 100 // smaller batches for larger text content
let loaded = 0
for (let i = 0; i < allSections.length; i += BATCH) {
  const batch = allSections.slice(i, i + BATCH)
  const { error } = await supabase.from('herodotus_histories').insert(batch)
  if (error) {
    console.error(`\nBatch error at ${i}:`, error.message)
    for (const row of batch) {
      const { error: e2 } = await supabase.from('herodotus_histories').insert(row)
      if (e2) console.error('Section error:', `Book ${row.book_number} Ch ${row.chapter}`, e2.message)
    }
  }
  loaded += batch.length
  process.stdout.write(`\rLoaded: ${loaded}/${allSections.length}`)
}

await supabase
  .from('intelligence_sources')
  .update({ entry_count: allSections.length, loaded_at: new Date().toISOString() })
  .eq('table_name', 'herodotus_histories')

// Summary
const bookCounts = {}
for (const s of allSections) {
  bookCounts[s.book_name] = (bookCounts[s.book_name] || 0) + 1
}
console.log('\n\nHerodotus\' Histories load complete:')
for (const [name, count] of Object.entries(bookCounts)) {
  console.log(`  ${name}: ${count} sections`)
}
console.log(`\n⚠️  TIER 4 SOURCE — All agent responses drawing from this data`)
console.log(`   must be flagged as historical context per Design Doctrine.`)
