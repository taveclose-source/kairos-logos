/**
 * Load Christaller's Dictionary of Asante and Fante Language (1881) into Supabase
 * Source: Internet Archive OCR — public domain
 * Target table: twi_lexicon
 * Run: node scripts/load-christaller.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const URL = 'https://archive.org/download/adictionaryasan00chrigoog/adictionaryasan00chrigoog_djvu.txt'

console.log('Fetching Christaller dictionary OCR...')
const resp = await fetch(URL)
const text = await resp.text()
console.log(`OCR text: ${text.length} chars`)

/**
 * Parse the OCR text into dictionary entries.
 * Christaller's format: headword in bold, followed by part of speech,
 * then English gloss and usage. OCR is messy — we use heuristic parsing.
 *
 * Pattern: Lines starting with a capitalized or accented Twi word,
 * followed by comma or period, then English definition.
 */

// Strip header/footer — find where actual dictionary entries start
// Dictionary entries start after the preface, around letter "A"
const lines = text.split('\n')
let dictStart = 0
let dictEnd = lines.length

for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim()
  // Look for the first section header like "A." or "A," marking the start of entries
  if (/^[A-Z]\s*\.\s*$/.test(l) && i > 100) {
    dictStart = i
    break
  }
  // Fallback: look for first headword-like pattern after preface
  if (i > 200 && /^[A-Za-zɔɛɲŋ]{2,}[,.]/.test(l)) {
    dictStart = i
    break
  }
}

// Look for appendix/end markers
for (let i = lines.length - 1; i > dictStart; i--) {
  const l = lines[i].trim()
  if (/ADDENDA|APPENDIX|ERRATA|INDEX/i.test(l)) {
    dictEnd = i
    break
  }
}

console.log(`Dictionary content: lines ${dictStart}-${dictEnd}`)

// Parse entries
// A dictionary entry typically starts with a Twi headword (possibly with diacritics)
// followed by punctuation and English gloss
const entries = []
let currentEntry = null
let pageNum = 1

// Twi word pattern: starts with letter, may contain ɔɛɲŋ and diacritics, at least 2 chars
const headwordPattern = /^([A-Za-zɔɛɲŋàáèéìíòóùúâêîôûãẽĩõũ'-]{2,})\s*[,.:;]\s*(.*)/

// Part of speech abbreviations used by Christaller
const posAbbrevs = {
  'v.': 'verb', 'n.': 'noun', 'adj.': 'adjective', 'adv.': 'adverb',
  'pr.': 'pronoun', 'prep.': 'preposition', 'conj.': 'conjunction',
  'int.': 'interjection', 'pref.': 'prefix', 'suf.': 'suffix',
  'v.a.': 'verb active', 'v.n.': 'verb neuter', 'v.t.': 'verb transitive',
  's.': 'noun', 'a.': 'adjective',
}

function extractPOS(text) {
  for (const [abbr, full] of Object.entries(posAbbrevs)) {
    if (text.toLowerCase().startsWith(abbr)) {
      return { pos: full, rest: text.slice(abbr.length).trim() }
    }
  }
  return { pos: null, rest: text }
}

function normalizetwi(word) {
  // Normalize common OCR misreadings and old orthography
  return word
    .replace(/0/g, 'ɔ')  // OCR often reads ɔ as 0
    .replace(/3/g, 'ɛ')  // OCR sometimes reads ɛ as 3
    .toLowerCase()
    .trim()
}

function flushEntry() {
  if (!currentEntry || !currentEntry.headword || currentEntry.headword.length < 2) return
  if (!currentEntry.gloss || currentEntry.gloss.length < 2) return

  // Clean up the gloss
  let gloss = currentEntry.gloss.replace(/\s+/g, ' ').trim()
  if (gloss.length > 1000) gloss = gloss.slice(0, 1000)

  // Extract related forms — words in parentheses or after "cf."
  const relatedMatch = gloss.match(/(?:cf\.|see|comp\.|=)\s*([A-Za-zɔɛɲŋ'-]+)/gi)
  const relatedForms = relatedMatch
    ? relatedMatch.map(m => m.replace(/^(?:cf\.|see|comp\.|=)\s*/i, '').trim()).filter(f => f.length >= 2)
    : null

  // Extract usage examples — text in italics markers or quotes
  const usageMatch = gloss.match(/"([^"]+)"/g)
  const usage = usageMatch ? usageMatch.map(u => u.replace(/"/g, '')).join('; ') : null

  entries.push({
    twi_headword: currentEntry.headword,
    twi_normalized: normalizetwi(currentEntry.headword),
    english_gloss: gloss,
    part_of_speech: currentEntry.pos || null,
    root_word: currentEntry.root || null,
    usage_examples: usage,
    dialect_notes: null,
    related_forms: relatedForms && relatedForms.length > 0 ? relatedForms : null,
    christaller_page: pageNum,
  })
}

for (let i = dictStart; i < dictEnd; i++) {
  const line = lines[i].trim()
  if (line.length < 2) continue

  // Track approximate page numbers (OCR sometimes has page markers)
  const pageMatch = line.match(/^\d{1,3}\s*$/)
  if (pageMatch) {
    pageNum = parseInt(pageMatch[0])
    continue
  }

  // Skip noise lines (all caps headers, page headers, etc.)
  if (line.length < 4 && /^[A-Z.\s]+$/.test(line)) continue

  // Try to match a headword
  const m = line.match(headwordPattern)
  if (m && m[1].length >= 2 && m[1].length <= 30) {
    // This looks like a new entry
    flushEntry()

    const headword = m[1]
    const rest = m[2] || ''
    const { pos, rest: afterPos } = extractPOS(rest)

    currentEntry = {
      headword,
      pos,
      gloss: afterPos,
      root: null,
    }
  } else if (currentEntry) {
    // Continuation of current entry
    currentEntry.gloss += ' ' + line
  }
}
flushEntry()

console.log(`Parsed ${entries.length} entries`)

// Deduplicate by headword (keep first occurrence — most complete)
const seen = new Set()
const unique = []
for (const e of entries) {
  const key = e.twi_normalized || e.twi_headword.toLowerCase()
  if (!seen.has(key)) {
    seen.add(key)
    unique.push(e)
  }
}
console.log(`Unique headwords: ${unique.length}`)

// Load into Supabase
const BATCH = 200
let loaded = 0
for (let i = 0; i < unique.length; i += BATCH) {
  const batch = unique.slice(i, i + BATCH)
  const { error } = await supabase.from('twi_lexicon').insert(batch)
  if (error) {
    console.error(`Batch error at ${i}:`, error.message)
    // Try individual inserts
    for (const row of batch) {
      const { error: e2 } = await supabase.from('twi_lexicon').insert(row)
      if (e2) console.error(`  Entry error (${row.twi_headword}):`, e2.message)
    }
  }
  loaded += batch.length
  process.stdout.write(`\rLoaded: ${loaded}/${unique.length}`)
}

console.log(`\n\nChristaller dictionary load complete: ${unique.length} entries`)
