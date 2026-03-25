/**
 * Load Gesenius' Hebrew-Chaldee Lexicon (via OpenScriptures HebrewLexicon) into Supabase
 * Source: CC BY 4.0 — openscriptures/HebrewLexicon (HebrewStrong.xml)
 * Run: node scripts/load-gesenius.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const XML_URL = 'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml'

console.log('Fetching Hebrew Lexicon XML from OpenScriptures...')
const resp = await fetch(XML_URL)
const xml = await resp.text()

// Parse XML entries manually (no external dependency needed)
// Each entry: <entry id="H1"> ... </entry>
const entryPattern = /<entry\s+id="(H\d+)">([\s\S]*?)<\/entry>/g
const entries = []
let match

while ((match = entryPattern.exec(xml)) !== null) {
  const strongsNum = match[1]
  const body = match[2]

  // Extract Hebrew word: <w ... xml:lang="heb">אָב</w>
  const wordMatch = body.match(/<w[^>]*>([^<]+)<\/w>/)
  const hebrewWord = wordMatch ? wordMatch[1].trim() : null

  // Extract transliteration: xlit="ʼab"
  const xlitMatch = body.match(/xlit="([^"]+)"/)
  const transliteration = xlitMatch ? xlitMatch[1] : null

  // Extract part of speech: pos="n-m"
  const posMatch = body.match(/pos="([^"]+)"/)
  const pos = posMatch ? posMatch[1] : null

  // Extract source/derivation: <source>...</source>
  const sourceMatch = body.match(/<source>([\s\S]*?)<\/source>/)
  const source = sourceMatch ? sourceMatch[1].replace(/<[^>]+>/g, '').trim() : null

  // Extract meaning/definition: <meaning>...</meaning>
  const meaningMatch = body.match(/<meaning>([\s\S]*?)<\/meaning>/)
  const definition = meaningMatch
    ? meaningMatch[1].replace(/<def>/g, '').replace(/<\/def>/g, '').replace(/<[^>]+>/g, '').trim()
    : null

  // Extract usage: <usage>...</usage>
  const usageMatch = body.match(/<usage>([\s\S]*?)<\/usage>/)
  const usage = usageMatch ? usageMatch[1].replace(/<[^>]+>/g, '').trim() : null

  // Build extended definition from all parts
  const extParts = []
  if (pos) extParts.push(`Part of speech: ${pos}`)
  if (source) extParts.push(`Derivation: ${source}`)
  if (definition) extParts.push(`Meaning: ${definition}`)
  if (usage) extParts.push(`KJV usage: ${usage}`)
  const extendedDef = extParts.join('\n')

  // Extract root references: <w src="H123">
  const rootRefs = []
  const rootPattern = /src="(H\d+)"/g
  let rootMatch
  while ((rootMatch = rootPattern.exec(body)) !== null) {
    if (rootMatch[1] !== strongsNum) rootRefs.push(rootMatch[1])
  }

  // Extract scripture references if any
  const scripRefs = []
  const scripPattern = /\b(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1\s*Samuel|2\s*Samuel|1\s*Kings|2\s*Kings|1\s*Chronicles|2\s*Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Proverbs|Ecclesiastes|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi)\s+\d+(?::\d+)?/gi
  let scripMatch
  while ((scripMatch = scripPattern.exec(body)) !== null) {
    scripRefs.push(scripMatch[0])
  }

  if (!definition && !usage) continue // skip empty entries

  entries.push({
    strongs_number: strongsNum,
    hebrew_word: hebrewWord,
    transliteration,
    definition: definition || usage || '',
    extended_definition: extendedDef,
    root: rootRefs.length > 0 ? rootRefs[0] : null,
    cognates: source,
    scripture_refs: scripRefs.length > 0 ? scripRefs : null,
    page_number: null
  })
}

console.log(`Parsed ${entries.length} Hebrew lexicon entries. Loading...`)

const BATCH = 500
let loaded = 0
for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH)
  const { error } = await supabase
    .from('gesenius_lexicon')
    .upsert(batch, { onConflict: 'strongs_number' })
  if (error) {
    console.error(`\nBatch error at ${i}:`, error.message)
    for (const row of batch) {
      const { error: e2 } = await supabase
        .from('gesenius_lexicon')
        .upsert(row, { onConflict: 'strongs_number' })
      if (e2) console.error('Row error:', row.strongs_number, e2.message)
    }
  }
  loaded += batch.length
  process.stdout.write(`\rLoaded: ${loaded}/${entries.length}`)
}

await supabase
  .from('intelligence_sources')
  .update({ entry_count: entries.length, loaded_at: new Date().toISOString() })
  .eq('table_name', 'gesenius_lexicon')

console.log('\nGesenius\' Hebrew-Chaldee Lexicon load complete')
