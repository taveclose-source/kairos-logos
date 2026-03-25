/**
 * Load Basel Mission English-Tshi Dictionary into Supabase
 * Source: Internet Archive OCR — public domain
 * Target table: english_twi_lexicon
 * Run: node scripts/load-english-twi.mjs
 *
 * OCR format (after line ~636):
 *   abandon,  v.  gyae,  gyau,  gya  mu,
 *   pa,  yi..ma;  gya  .kyene.
 *   abase,  v.  bere  ase;  boto.
 *
 * Entries: lowercase headword, comma, POS abbreviation, period, then Twi words.
 * Lines often wrap. Page headers appear as short all-caps lines or bare numbers.
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const URL = 'https://archive.org/download/englishtshiasant00evaniala/englishtshiasant00evaniala_djvu.txt'

console.log('Fetching Basel English-Tshi dictionary OCR...')
const resp = await fetch(URL)
const rawText = await resp.text()
console.log(`OCR text: ${rawText.length} chars`)

const lines = rawText.split('\n')

// Find the first "A." section header — this is where entries begin
let dictStart = 0
for (let i = 500; i < 800; i++) {
  if (/^A\s*\.\s*$/.test(lines[i]?.trim())) {
    dictStart = i + 1
    break
  }
}

// Find the second "A." which starts the appendix/addenda at line ~24693
let dictEnd = lines.length
for (let i = dictStart + 1000; i < lines.length; i++) {
  if (/^A\s*\.\s*$/.test(lines[i]?.trim())) {
    dictEnd = i
    break
  }
}

console.log(`Dictionary body: lines ${dictStart}–${dictEnd} (${dictEnd - dictStart} lines)`)

// Join all dictionary lines into one continuous text, preserving entry boundaries
// First, collapse the multi-line text into a single string
let body = ''
let pageNum = 1
const pageMap = [] // track character positions where pages change

for (let i = dictStart; i < dictEnd; i++) {
  const line = lines[i].trim()
  if (!line) continue

  // Page numbers: bare digits on their own line (e.g. "86", "132")
  if (/^\d{1,3}$/.test(line)) {
    pageNum = parseInt(line)
    pageMap.push({ pos: body.length, page: pageNum })
    continue
  }

  // Skip page headers: short all-caps lines like "gra", "oni", "ord" (column guides)
  if (line.length <= 4 && /^[a-z]+$/i.test(line)) continue

  // Skip section letter headers: "B.", "C.", etc.
  if (/^[A-Z]\s*\.\s*$/.test(line)) {
    body += ' '
    continue
  }

  body += ' ' + line
}

console.log(`Collapsed body: ${body.length} chars`)

// Now parse entries from the collapsed text.
// Entry pattern: english_word, POS. twi_content
// An entry starts with a lowercase (or capitalized) English word followed by a comma and POS.
// POS abbreviations: v. n. a. ad. pr.n. prp. conj. int. num. phr.
//
// Strategy: split on the boundary where a new English headword begins.
// Boundary: one of the POS-terminated patterns followed by Twi content,
// then a new English word + comma + POS.

const entryPattern = /\b([a-z][a-z'-]{1,25})\s*,\s*(v\.|n\.|a\.|ad\.|s\.|prp?\.|conj\.|int\.|num\.|phr\.|pr\.\s*n\.)\s*/gi

// Find all match positions
const matches = []
let m
while ((m = entryPattern.exec(body)) !== null) {
  // Validate: headword should be a real English word (no weird OCR fragments)
  const hw = m[1].toLowerCase()
  // Skip if it looks like a Twi word (contains ɔ, ɛ, ŋ, etc.) or is too short
  if (/[ɔɛɲŋ]/.test(hw)) continue
  if (hw.length < 2) continue
  // Skip common non-headwords that the POS pattern might catch in running text
  if (['to', 'be', 'do', 'is', 'he', 'it', 'or', 'of', 'in', 'at', 'on', 'no', 'so', 'up', 'my'].includes(hw)) continue

  matches.push({
    headword: hw,
    pos: m[2].replace(/\s+/g, ''),
    startIdx: m.index,
    contentStart: m.index + m[0].length,
  })
}

console.log(`Found ${matches.length} potential entries`)

// Extract content between entries
const entries = []
const commonEnglish = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one',
  'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now',
  'old', 'see', 'way', 'who', 'did', 'let', 'say', 'she', 'too', 'use', 'off', 'run',
  'set', 'try', 'ask', 'own', 'any', 'few', 'got', 'big', 'come', 'make', 'like', 'just',
  'over', 'such', 'take', 'them', 'than', 'well', 'also', 'been', 'much', 'then', 'some',
  'very', 'when', 'what', 'your', 'will', 'each', 'from', 'have', 'this', 'with', 'that',
  'they', 'been', 'said', 'fig', 'pass', 'self'
])

function extractTwiWords(text) {
  // Split on punctuation that separates Twi words
  const parts = text.split(/[;,]/)
  const twiWords = []
  const seen = new Set()

  for (const p of parts) {
    // Take individual words from each segment
    const words = p.trim().split(/\s+/)
    for (const w of words) {
      const clean = w.replace(/[^a-zA-Zɔɛɲŋàáèéìíòóùúâêîôûãẽĩõũ'-]/g, '').toLowerCase()
      if (clean.length < 2) continue
      // Skip English words (common words, or words that appear as headwords)
      if (commonEnglish.has(clean)) continue
      // Skip obvious POS/grammar markers
      if (/^(v|n|a|ad|prp|conj|int|num|phr|pass|fig|inf|der|cf|pi|lit|jud|eccl|euph|anat|obs|caus|perf|part)\.?$/.test(clean)) continue
      // Skip section references like §74
      if (/^§?\d+/.test(clean)) continue
      // Likely Twi if it contains typical Twi patterns or is lowercase non-English
      if (!seen.has(clean) && twiWords.length < 15) {
        seen.add(clean)
        twiWords.push(clean)
      }
    }
  }
  return twiWords
}

function getPageForPos(charPos) {
  let p = 1
  for (const entry of pageMap) {
    if (entry.pos > charPos) break
    p = entry.page
  }
  return p
}

// POS abbreviation to full name
const posMap = {
  'v.': 'verb', 'n.': 'noun', 'a.': 'adjective', 'ad.': 'adverb',
  's.': 'noun', 'prp.': 'preposition', 'pr.': 'pronoun', 'pr.n.': 'proper noun',
  'conj.': 'conjunction', 'int.': 'interjection', 'num.': 'numeral', 'phr.': 'phrase',
}

for (let i = 0; i < matches.length; i++) {
  const entry = matches[i]
  const nextStart = i + 1 < matches.length ? matches[i + 1].startIdx : body.length
  const content = body.slice(entry.contentStart, nextStart).trim()

  // Extract up to the first sentence boundary that looks like end of this entry
  // (content before the next headword)
  const usableContent = content.slice(0, 400)
  const twiWords = extractTwiWords(usableContent)

  if (twiWords.length === 0) continue

  entries.push({
    english_headword: entry.headword,
    twi_equivalents: twiWords,
    usage_context: usableContent.replace(/\s+/g, ' ').trim().slice(0, 500) || null,
    dialect: 'Asante',
    basel_page: getPageForPos(entry.startIdx),
  })
}

console.log(`Valid entries with Twi words: ${entries.length}`)

// Deduplicate — keep first occurrence (most complete for compound entries)
const seen = new Set()
const unique = []
for (const e of entries) {
  if (!seen.has(e.english_headword)) {
    seen.add(e.english_headword)
    unique.push(e)
  }
}
console.log(`Unique headwords: ${unique.length}`)

// Sample
console.log('\nSample entries:')
for (const e of unique.slice(0, 8)) {
  console.log(`  ${e.english_headword} (p.${e.basel_page}): [${e.twi_equivalents.slice(0, 5).join(', ')}]`)
}

// Load into Supabase
const BATCH = 200
let loaded = 0
for (let i = 0; i < unique.length; i += BATCH) {
  const batch = unique.slice(i, i + BATCH)
  const { error } = await supabase.from('english_twi_lexicon').insert(batch)
  if (error) {
    console.error(`Batch error at ${i}:`, error.message)
    for (const row of batch) {
      const { error: e2 } = await supabase.from('english_twi_lexicon').insert(row)
      if (e2) console.error(`  Entry error (${row.english_headword}):`, e2.message)
    }
  }
  loaded += batch.length
  process.stdout.write(`\rLoaded: ${loaded}/${unique.length}`)
}

console.log(`\n\nBasel English-Tshi dictionary load complete: ${unique.length} entries`)
