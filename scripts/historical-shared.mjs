/**
 * Shared utilities for Tier 4 historical source loaders
 * Used by: load-josephus.mjs, load-eusebius.mjs, load-philo.mjs,
 *          load-strabo.mjs, load-tacitus.mjs, load-thucydides.mjs
 */
import { createClient } from '@supabase/supabase-js'

export function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Biblical proper nouns that connect to Scripture
export const BIBLICAL_NOUNS = new Set([
  'Cyrus', 'Darius', 'Xerxes', 'Babylon', 'Babylonians', 'Jerusalem',
  'Egypt', 'Egyptians', 'Pharaoh', 'Necho', 'Nebuchadnezzar',
  'Phoenicia', 'Phoenicians', 'Tyre', 'Sidon', 'Syria', 'Assyria',
  'Assyrians', 'Nineveh', 'Persia', 'Persians', 'Media', 'Medes',
  'Jews', 'Judaea', 'Judea', 'Palestine', 'Philistines', 'Ethiopia',
  'Ethiopians', 'Arabia', 'Arabians', 'Cambyses', 'Artaxerxes',
  'Susa', 'Shushan', 'Elam', 'Cush', 'Libya', 'Red Sea',
  'Euphrates', 'Tigris', 'Nile', 'Memphis', 'Thebes',
  // NT-era additions
  'Jesus', 'Christ', 'Pilate', 'Herod', 'Caesar', 'Augustus',
  'Tiberius', 'Nero', 'Vespasian', 'Titus', 'Galilee', 'Nazareth',
  'Bethlehem', 'Samaria', 'Samaritans', 'Capernaum', 'Jordan',
  'Rome', 'Romans', 'Roman', 'Antioch', 'Damascus', 'Corinth',
  'Ephesus', 'Athens', 'Thessalonica', 'Galatia', 'Macedonia',
  'Israel', 'Israelites', 'Moses', 'Abraham', 'David', 'Solomon',
  'Temple', 'Pharisees', 'Sadducees', 'Sanhedrin', 'Passover',
  'Peter', 'Paul', 'James', 'John', 'Stephen', 'Barnabas',
  'Pontius', 'Caiaphas', 'Annas', 'Festus', 'Felix', 'Agrippa',
  'Masada', 'Jericho', 'Bethany', 'Mount Olivet', 'Sinai',
  'Decapolis', 'Idumea', 'Edom', 'Moab', 'Ammon',
  'Alexander', 'Ptolemy', 'Seleucid', 'Antiochus', 'Maccabee',
  'Maccabees', 'Hasmonean', 'Hasmoneans',
  'Crete', 'Cyprus', 'Malta', 'Sicily', 'Carthage',
  'Sparta', 'Spartans', 'Athenians', 'Greeks', 'Greek',
  'Thrace', 'Thessaly', 'Bosphorus', 'Hellespont',
  'Constantine', 'Diocletian', 'Trajan', 'Hadrian',
  'Josephus', 'Philo', 'Origen',
])

// Scripture cross-references for key figures/places
export const SCRIPTURE_MAP = {
  'Cyrus': ['Isaiah 44:28', 'Isaiah 45:1', 'Ezra 1:1-4', '2 Chronicles 36:22-23', 'Daniel 6:28'],
  'Darius': ['Daniel 6:1', 'Ezra 6:1', 'Haggai 1:1', 'Zechariah 1:1'],
  'Xerxes': ['Esther 1:1', 'Ezra 4:6'],
  'Babylon': ['Daniel 1:1', 'Jeremiah 50:1', '2 Kings 24:1', 'Isaiah 13:1', 'Revelation 17:5'],
  'Nebuchadnezzar': ['Daniel 1:1', '2 Kings 24:1', 'Jeremiah 25:1'],
  'Egypt': ['Genesis 12:10', 'Exodus 1:1', 'Isaiah 19:1', 'Matthew 2:13'],
  'Necho': ['2 Kings 23:29', '2 Chronicles 35:20-22'],
  'Jerusalem': ['2 Kings 25:1', 'Ezra 1:2', 'Nehemiah 2:17', 'Luke 19:41', 'Acts 1:8'],
  'Tyre': ['Ezekiel 26:1-7', 'Isaiah 23:1', 'Matthew 15:21'],
  'Sidon': ['Ezekiel 28:21-22', 'Luke 6:17'],
  'Nineveh': ['Nahum 1:1', 'Jonah 1:2'],
  'Susa': ['Nehemiah 1:1', 'Esther 1:2', 'Daniel 8:2'],
  'Euphrates': ['Genesis 2:14', 'Revelation 9:14'],
  'Red Sea': ['Exodus 14:21-22'],
  'Jesus': ['Matthew 1:1', 'John 1:1', 'Acts 1:1'],
  'Christ': ['Matthew 1:16', 'Acts 2:36', 'Romans 1:1'],
  'Pilate': ['Matthew 27:2', 'Luke 23:1', 'John 18:29', 'Acts 3:13'],
  'Herod': ['Matthew 2:1', 'Luke 1:5', 'Acts 12:1'],
  'Caesar': ['Luke 2:1', 'Acts 25:11'],
  'Augustus': ['Luke 2:1'],
  'Tiberius': ['Luke 3:1'],
  'Nero': ['Acts 25:11', '2 Timothy 4:16-17'],
  'Vespasian': ['Luke 21:20'],
  'Temple': ['1 Kings 6:1', 'Ezra 3:10', 'Matthew 24:1-2', 'John 2:19'],
  'Galilee': ['Matthew 4:12', 'Acts 1:11'],
  'Samaria': ['John 4:4', 'Acts 8:1'],
  'Rome': ['Acts 28:16', 'Romans 1:7'],
  'Antioch': ['Acts 11:26', 'Acts 13:1', 'Galatians 2:11'],
  'Damascus': ['Acts 9:2', '2 Corinthians 11:32'],
  'Corinth': ['Acts 18:1', '1 Corinthians 1:2'],
  'Ephesus': ['Acts 19:1', 'Ephesians 1:1', 'Revelation 2:1'],
  'Athens': ['Acts 17:16'],
  'Alexander': ['Daniel 8:21', 'Daniel 11:3'],
  'Antiochus': ['Daniel 11:21-35'],
  'Passover': ['Exodus 12:11', 'Matthew 26:17'],
  'Peter': ['Matthew 16:18', 'Acts 2:14', '1 Peter 1:1'],
  'Paul': ['Acts 9:1', 'Romans 1:1'],
  'Stephen': ['Acts 6:5', 'Acts 7:59'],
  'David': ['1 Samuel 16:13', 'Matthew 1:1'],
  'Solomon': ['1 Kings 3:1', 'Matthew 12:42'],
  'Moses': ['Exodus 3:1', 'Acts 7:20'],
  'Abraham': ['Genesis 12:1', 'Romans 4:1', 'Hebrews 11:8'],
  'Israel': ['Genesis 32:28', 'Romans 9:6'],
  'Constantine': ['Revelation 2-3'],
  'Masada': ['Matthew 24:16'],
  'Pharisees': ['Matthew 23:1', 'Acts 23:6'],
  'Sadducees': ['Matthew 22:23', 'Acts 5:17'],
  'Festus': ['Acts 25:1'],
  'Felix': ['Acts 24:1'],
  'Agrippa': ['Acts 25:13', 'Acts 26:1'],
  'Caiaphas': ['Matthew 26:57', 'John 18:13'],
}

export function extractProperNouns(text) {
  const nouns = new Set()
  for (const noun of BIBLICAL_NOUNS) {
    if (text.includes(noun)) nouns.add(noun)
  }
  return nouns.size > 0 ? Array.from(nouns) : null
}

export function getScriptureConnections(properNouns) {
  if (!properNouns) return null
  const refs = new Set()
  for (const noun of properNouns) {
    if (SCRIPTURE_MAP[noun]) {
      SCRIPTURE_MAP[noun].forEach(r => refs.add(r))
    }
  }
  return refs.size > 0 ? Array.from(refs) : null
}

export async function fetchGutenberg(url, label) {
  console.log(`Fetching ${label}...`)
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to fetch ${label}: ${resp.status}`)
  const text = await resp.text()

  // Strip Project Gutenberg header and footer
  const startMarker = /\*\*\*\s*START OF.*?\*\*\*/i
  const endMarker = /\*\*\*\s*END OF.*?\*\*\*/i

  let content = text
  const startMatch = content.match(startMarker)
  const endMatch = content.match(endMarker)
  if (startMatch) content = content.slice(startMatch.index + startMatch[0].length)
  if (endMatch) content = content.slice(0, content.search(endMarker))

  return content.trim()
}

/**
 * Generic section parser: splits text into ~80-line chunks,
 * detecting book transitions via bookDetector callback.
 * bookDetector(line) => bookNum or null
 */
export function parseIntoSections(text, { sourceName, defaultBook, bookMeta, bookDetector }) {
  const sections = []
  const lines = text.split('\n')
  let currentBook = defaultBook || 1
  let chunkLines = []
  let chapterNum = 1

  function flushChunk() {
    const content = chunkLines.join('\n').trim()
    if (content.length < 50) return

    const nouns = extractProperNouns(content)
    const scripRefs = getScriptureConnections(nouns)
    const meta = bookMeta[currentBook] || {}

    sections.push({
      source_name: sourceName,
      book_number: currentBook,
      book_name: meta.name || `Book ${currentBook}`,
      chapter: chapterNum,
      content,
      proper_nouns: nouns,
      scripture_connections: scripRefs,
      kingdoms: meta.kingdoms || null,
      geographic_region: meta.regions || null,
      date_range_start: meta.start || null,
      date_range_end: meta.end || null,
      source_tier: 4,
      authority_notice: 'Historical context only — not theological authority. The Bible interprets history.',
    })
    chapterNum++
    chunkLines = []
  }

  for (const line of lines) {
    const newBook = bookDetector ? bookDetector(line) : null

    if (newBook && newBook !== currentBook) {
      flushChunk()
      currentBook = newBook
      chapterNum = 1
      continue
    }

    chunkLines.push(line)

    if (chunkLines.length >= 80) {
      let breakIdx = chunkLines.length
      for (let j = chunkLines.length - 1; j >= 60; j--) {
        if (chunkLines[j].trim() === '') { breakIdx = j; break }
      }
      const flushing = chunkLines.slice(0, breakIdx)
      chunkLines = chunkLines.slice(breakIdx)
      const temp = chunkLines
      chunkLines = flushing
      flushChunk()
      chunkLines = temp
    }
  }

  flushChunk()
  return sections
}

export async function loadSections(supabase, sections, sourceName) {
  console.log(`\nLoading ${sections.length} sections for ${sourceName}...`)
  const BATCH = 100
  let loaded = 0
  for (let i = 0; i < sections.length; i += BATCH) {
    const batch = sections.slice(i, i + BATCH)
    const { error } = await supabase.from('historical_sources').insert(batch)
    if (error) {
      console.error(`\nBatch error at ${i}:`, error.message)
      for (const row of batch) {
        const { error: e2 } = await supabase.from('historical_sources').insert(row)
        if (e2) console.error(`  Row error: Book ${row.book_number} Ch ${row.chapter}:`, e2.message)
      }
    }
    loaded += batch.length
    process.stdout.write(`\r  Loaded: ${loaded}/${sections.length}`)
  }
  console.log()
  return loaded
}

export function printSummary(sections, sourceName) {
  const bookCounts = {}
  for (const s of sections) {
    bookCounts[s.book_name] = (bookCounts[s.book_name] || 0) + 1
  }
  console.log(`\n${sourceName} load complete:`)
  for (const [name, count] of Object.entries(bookCounts)) {
    console.log(`  ${name}: ${count} sections`)
  }
  console.log(`  Total: ${sections.length} sections`)
  console.log(`\n  TIER 4 SOURCE — All agent responses drawing from this data`)
  console.log(`  must be flagged as historical context per Design Doctrine.`)
}
