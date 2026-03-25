/**
 * Load Smith's Bible Dictionary into Supabase
 * Source: Public domain text from CCEL
 * Run: node scripts/load-smiths.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TXT_URL = 'https://www.ccel.org/ccel/s/smith_w/bibledict/cache/bibledict.txt'

console.log('Fetching Smith\'s Bible Dictionary from CCEL...')
const resp = await fetch(TXT_URL)
const text = await resp.text()

// Parse the plain text format: entries are separated by headwords on their own line
// Headword lines are typically ALL CAPS or Title Case followed by definition paragraphs
const lines = text.split('\n')
const entries = []
let currentTopic = null
let currentDef = []
let inContent = false

// Scripture reference pattern: matches things like Gen. 1:1, Matt. 5:3-7, etc.
const refPattern = /\b(Gen(?:esis)?|Exod(?:us)?|Lev(?:iticus)?|Num(?:bers)?|Deut(?:eronomy)?|Josh(?:ua)?|Judg(?:es)?|Ruth|1\s*Sam(?:uel)?|2\s*Sam(?:uel)?|1\s*Ki(?:ngs)?|2\s*Ki(?:ngs)?|1\s*Chr(?:on(?:icles)?)?|2\s*Chr(?:on(?:icles)?)?|Ezra|Neh(?:emiah)?|Esth(?:er)?|Job|Ps(?:a(?:lm)?)?|Prov(?:erbs)?|Eccl(?:es(?:iastes)?)?|Song|Isa(?:iah)?|Jer(?:emiah)?|Lam(?:entations)?|Ezek(?:iel)?|Dan(?:iel)?|Hos(?:ea)?|Joel|Amos|Obad(?:iah)?|Jon(?:ah)?|Mic(?:ah)?|Nah(?:um)?|Hab(?:akkuk)?|Zeph(?:aniah)?|Hag(?:gai)?|Zech(?:ariah)?|Mal(?:achi)?|Matt(?:hew)?|Mark|Luke|John|Acts|Rom(?:ans)?|1\s*Cor(?:inthians)?|2\s*Cor(?:inthians)?|Gal(?:atians)?|Eph(?:esians)?|Phil(?:ippians)?|Col(?:ossians)?|1\s*Thess(?:alonians)?|2\s*Thess(?:alonians)?|1\s*Tim(?:othy)?|2\s*Tim(?:othy)?|Tit(?:us)?|Philem(?:on)?|Heb(?:rews)?|Jam(?:es)?|1\s*Pet(?:er)?|2\s*Pet(?:er)?|1\s*John|2\s*John|3\s*John|Jude|Rev(?:elation)?)\s*\.?\s*\d+(?::\d+(?:\s*[-–]\s*\d+)?)?/gi

function extractRefs(text) {
  const matches = text.match(refPattern)
  return matches ? [...new Set(matches.map(m => m.trim()))] : null
}

function classifyEntry(topic) {
  const t = topic.toLowerCase()
  // Simple heuristic classification
  if (/^(mount |sea |river |lake |valley |plain |city |land |region |desert )/.test(t)) return 'place'
  return null // let it be classified later or manually
}

function flushEntry() {
  if (currentTopic && currentDef.length > 0) {
    const definition = currentDef.join(' ').replace(/\s+/g, ' ').trim()
    if (definition.length > 10) { // skip trivially short entries
      const refs = extractRefs(definition)
      entries.push({
        topic: currentTopic,
        topic_normalized: currentTopic.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(),
        definition,
        scripture_refs: refs,
        strongs_numbers: null,
        see_also: null,
        entry_type: classifyEntry(currentTopic)
      })
    }
  }
  currentDef = []
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]

  // Skip front matter until we hit actual dictionary content
  if (!inContent) {
    // Look for the first dictionary entry — typically starts after table of contents
    if (/^[A-Z][A-Z]/.test(line.trim()) && line.trim().length < 80 && line.trim().length > 1) {
      // Check if next line is indented or starts definition
      const nextLine = lines[i + 1] || ''
      if (nextLine.match(/^\s{2,}/) || nextLine.match(/^\s*\(/) || nextLine.trim() === '') {
        inContent = true
      }
    }
    if (!inContent) continue
  }

  const trimmed = line.trim()

  // Detect headword: line that is relatively short, starts with capital,
  // and next line is indented or empty
  if (trimmed.length > 0 && trimmed.length < 80 && /^[A-Z]/.test(trimmed) && !trimmed.startsWith('   ')) {
    const nextLine = (lines[i + 1] || '').trimEnd()
    // Headword if next line is indented or starts with (
    if (nextLine.match(/^\s{2,}/) || nextLine.match(/^\s*\(/) || nextLine.trim() === '') {
      flushEntry()
      currentTopic = trimmed
      continue
    }
  }

  // Accumulate definition text
  if (currentTopic && trimmed.length > 0) {
    currentDef.push(trimmed)
  }
}

flushEntry()

console.log(`Parsed ${entries.length} dictionary entries. Loading...`)

const BATCH = 500
let loaded = 0
for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH)
  const { error } = await supabase.from('smiths_dictionary').insert(batch)
  if (error) {
    console.error(`Batch error at ${i}:`, error.message)
    for (const row of batch) {
      const { error: e2 } = await supabase.from('smiths_dictionary').insert(row)
      if (e2 && !e2.message.includes('duplicate')) console.error('Row error:', row.topic, e2.message)
    }
  }
  loaded += batch.length
  process.stdout.write(`\rLoaded: ${loaded}/${entries.length}`)
}

await supabase
  .from('intelligence_sources')
  .update({ entry_count: entries.length, loaded_at: new Date().toISOString() })
  .eq('table_name', 'smiths_dictionary')

console.log('\nSmith\'s Bible Dictionary load complete')
