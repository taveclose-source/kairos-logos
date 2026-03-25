/**
 * Load Nave's Topical Bible into Supabase
 * Source: Public domain CSV from BradyStephenson/bible-data
 * Run: node scripts/load-naves.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CSV_URL = 'https://raw.githubusercontent.com/BradyStephenson/bible-data/main/NavesTopicalDictionary.csv'

console.log('Fetching Nave\'s Topical Bible...')
const resp = await fetch(CSV_URL)
const text = await resp.text()

// CSV format: section,subject,entry
// Parse properly handling quoted fields
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// Scripture reference extraction
const refPattern = /\b(GEN|EXO|LEV|NUM|DEU|JOS|JDG|RUT|1SA|2SA|1KI|2KI|1CH|2CH|EZR|NEH|EST|JOB|PSA|PRO|ECC|SNG|ISA|JER|LAM|EZK|DAN|HOS|JOL|AMO|OBA|JON|MIC|NAH|HAB|ZEP|HAG|ZEC|MAL|MAT|MRK|LUK|JHN|ACT|ROM|1CO|2CO|GAL|EPH|PHP|COL|1TH|2TH|1TI|2TI|TIT|PHM|HEB|JAS|1PE|2PE|1JN|2JN|3JN|JDE|REV)\s+\d+(?::\d+(?:\s*[-–,]\s*\d+)*)?/g

const BOOK_ABBREV_MAP = {
  GEN: 'Genesis', EXO: 'Exodus', LEV: 'Leviticus', NUM: 'Numbers',
  DEU: 'Deuteronomy', JOS: 'Joshua', JDG: 'Judges', RUT: 'Ruth',
  '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Kings', '2KI': '2 Kings',
  '1CH': '1 Chronicles', '2CH': '2 Chronicles', EZR: 'Ezra', NEH: 'Nehemiah',
  EST: 'Esther', JOB: 'Job', PSA: 'Psalms', PRO: 'Proverbs',
  ECC: 'Ecclesiastes', SNG: 'Song of Solomon', ISA: 'Isaiah', JER: 'Jeremiah',
  LAM: 'Lamentations', EZK: 'Ezekiel', DAN: 'Daniel', HOS: 'Hosea',
  JOL: 'Joel', AMO: 'Amos', OBA: 'Obadiah', JON: 'Jonah',
  MIC: 'Micah', NAH: 'Nahum', HAB: 'Habakkuk', ZEP: 'Zephaniah',
  HAG: 'Haggai', ZEC: 'Zechariah', MAL: 'Malachi', MAT: 'Matthew',
  MRK: 'Mark', LUK: 'Luke', JHN: 'John', ACT: 'Acts',
  ROM: 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians',
  GAL: 'Galatians', EPH: 'Ephesians', PHP: 'Philippians',
  COL: 'Colossians', '1TH': '1 Thessalonians', '2TH': '2 Thessalonians',
  '1TI': '1 Timothy', '2TI': '2 Timothy', TIT: 'Titus', PHM: 'Philemon',
  HEB: 'Hebrews', JAS: 'James', '1PE': '1 Peter', '2PE': '2 Peter',
  '1JN': '1 John', '2JN': '2 John', '3JN': '3 John', JDE: 'Jude',
  REV: 'Revelation'
}

function expandRef(ref) {
  return ref.replace(/^([A-Z0-9]+)/, (m) => BOOK_ABBREV_MAP[m] || m)
}

function extractRefs(text) {
  const matches = text.match(refPattern)
  if (!matches) return null
  const expanded = [...new Set(matches.map(m => expandRef(m.trim())))]
  return expanded.length > 0 ? expanded : null
}

const lines = text.split('\n').slice(1) // skip header
const entries = []

for (const line of lines) {
  if (!line.trim()) continue
  const fields = parseCSVLine(line)
  if (fields.length < 3) continue

  const [section, subject, entry] = fields
  if (!subject || !entry) continue

  const content = entry.replace(/^-/, '').trim()
  if (!content) continue

  // Check if this is a subtopic (starts with a number or dash pattern)
  const subtopicMatch = content.match(/^(\d+)\.\s*(.+)/)
  const subtopic = subtopicMatch ? subtopicMatch[1] : null
  const cleanContent = subtopicMatch ? subtopicMatch[2] : content

  const refs = extractRefs(content)

  // Extract see also references
  const seeAlsoMatch = content.match(/[Ss]ee\s+(?:also\s+)?([A-Z][A-Z\s,;]+)/g)
  const seeAlso = seeAlsoMatch
    ? seeAlsoMatch.map(s => s.replace(/^[Ss]ee\s+(?:also\s+)?/, '').trim()).filter(Boolean)
    : null

  entries.push({
    topic: subject,
    topic_normalized: subject.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
    subtopic,
    content: cleanContent,
    scripture_refs: refs,
    see_also: seeAlso && seeAlso.length > 0 ? seeAlso : null,
    strongs_numbers: null
  })
}

console.log(`Parsed ${entries.length} topical entries. Loading...`)

const BATCH = 500
let loaded = 0
for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH)
  const { error } = await supabase.from('naves_topical').insert(batch)
  if (error) {
    console.error(`\nBatch error at ${i}:`, error.message)
    for (const row of batch) {
      const { error: e2 } = await supabase.from('naves_topical').insert(row)
      if (e2 && !e2.message.includes('duplicate')) console.error('Row error:', row.topic, e2.message)
    }
  }
  loaded += batch.length
  process.stdout.write(`\rLoaded: ${loaded}/${entries.length}`)
}

await supabase
  .from('intelligence_sources')
  .update({ entry_count: entries.length, loaded_at: new Date().toISOString() })
  .eq('table_name', 'naves_topical')

console.log('\nNave\'s Topical Bible load complete')
