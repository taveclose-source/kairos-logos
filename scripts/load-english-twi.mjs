/**
 * Load Basel Mission English-Tshi Dictionary into Supabase
 * Source: Internet Archive OCR — public domain
 * Target table: english_twi_lexicon
 * Run: node scripts/load-english-twi.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const URL = 'https://archive.org/download/englishtshiasant00evaniala/englishtshiasant00evaniala_djvu.txt'

console.log('Fetching Basel English-Tshi dictionary OCR...')
const resp = await fetch(URL)
const text = await resp.text()
console.log(`OCR text: ${text.length} chars`)

const lines = text.split('\n')

// Find where dictionary entries start (after preface/introduction)
let dictStart = 0
let dictEnd = lines.length

for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim()
  // Look for the start of "A" section
  if (/^A\s*[.]?\s*$/.test(l) && i > 50) {
    dictStart = i
    break
  }
  // Fallback: first line that looks like an English headword entry
  if (i > 100 && /^[A-Z][a-z]+[,.]/.test(l)) {
    dictStart = i
    break
  }
}

for (let i = lines.length - 1; i > dictStart; i--) {
  const l = lines[i].trim()
  if (/APPENDIX|ADDENDA|INDEX|ERRATA/i.test(l)) {
    dictEnd = i
    break
  }
}

console.log(`Dictionary content: lines ${dictStart}-${dictEnd}`)

/**
 * English-Tshi format: English headword, followed by Twi equivalent(s)
 * Pattern: "Abandon, v.  gya, gyaw; pa mu"
 */

const entries = []
let currentEntry = null
let pageNum = 1

// English headword pattern: Capitalized word followed by comma or period
const headwordPattern = /^([A-Z][a-z'-]{1,25})\s*[,.:]\s*(.*)/

function extractTwiWords(text) {
  // Twi equivalents are typically lowercase words with possible diacritics
  // separated by commas or semicolons
  const cleaned = text
    .replace(/\b(?:v\.|n\.|adj\.|adv\.|s\.|a\.|prep\.|conj\.|int\.|pron\.)\s*/gi, '')
    .replace(/\([^)]*\)/g, '') // Remove parenthetical notes
    .trim()

  if (!cleaned) return []

  // Split on commas and semicolons, take words that look like Twi
  const parts = cleaned.split(/[;,]/)
  const twiWords = []
  for (const p of parts) {
    const word = p.trim().split(/\s+/)[0] // Take first word of each segment
    if (word && word.length >= 2 && /^[a-zɔɛɲŋàáèéìíòóùúâêîôûãẽĩõũ'-]+$/i.test(word)) {
      twiWords.push(word)
    }
  }
  return twiWords
}

function flushEntry() {
  if (!currentEntry || !currentEntry.headword) return

  const fullText = currentEntry.gloss.replace(/\s+/g, ' ').trim()
  const twiEquivs = extractTwiWords(fullText)

  if (twiEquivs.length === 0) {
    // If no Twi words extracted, store the whole gloss as one equivalent
    if (fullText.length >= 2 && fullText.length <= 100) {
      twiEquivs.push(fullText.split(/[,;.]/)[0].trim())
    }
  }

  if (twiEquivs.length === 0) return

  entries.push({
    english_headword: currentEntry.headword.toLowerCase(),
    twi_equivalents: twiEquivs,
    usage_context: fullText.length > 3 ? fullText.slice(0, 500) : null,
    dialect: 'Asante',
    basel_page: pageNum,
  })
}

for (let i = dictStart; i < dictEnd; i++) {
  const line = lines[i].trim()
  if (line.length < 2) continue

  // Track page numbers
  const pageMatch = line.match(/^\d{1,3}\s*$/)
  if (pageMatch) {
    pageNum = parseInt(pageMatch[0])
    continue
  }

  // Skip noise
  if (line.length < 4 && /^[A-Z.\s]+$/.test(line)) continue

  const m = line.match(headwordPattern)
  if (m && m[1].length >= 2 && m[1].length <= 25) {
    flushEntry()
    currentEntry = {
      headword: m[1],
      gloss: m[2] || '',
    }
  } else if (currentEntry) {
    currentEntry.gloss += ' ' + line
  }
}
flushEntry()

console.log(`Parsed ${entries.length} entries`)

// Deduplicate by headword
const seen = new Set()
const unique = []
for (const e of entries) {
  const key = e.english_headword
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
