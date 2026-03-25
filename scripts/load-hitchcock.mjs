/**
 * Load Hitchcock's Bible Names Dictionary into Supabase
 * Source: Public domain CSV from BradyStephenson/bible-data
 * Run: node scripts/load-hitchcock.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CSV_URL = 'https://raw.githubusercontent.com/BradyStephenson/bible-data/main/HitchcocksBibleNamesDictionary.csv'

console.log('Fetching Hitchcock\'s Bible Names Dictionary...')
const resp = await fetch(CSV_URL)
const text = await resp.text()
const lines = text.split('\n').slice(1) // skip header

const entries = []

for (const line of lines) {
  if (!line.trim()) continue
  // CSV format: Name,Meaning
  const commaIdx = line.indexOf(',')
  if (commaIdx === -1) continue

  const name = line.slice(0, commaIdx).trim()
  const meaning = line.slice(commaIdx + 1).trim().replace(/^"|"$/g, '')

  if (!name || !meaning) continue

  entries.push({
    name,
    name_normalized: name.toLowerCase().replace(/[^a-z]/g, ''),
    meaning,
    language_origin: null,  // not in source data
    gender: null,
    scripture_refs: null,
    strongs_number: null,
    notes: null
  })
}

console.log(`Parsed ${entries.length} name entries. Loading...`)

// Batch upsert
const BATCH = 500
let loaded = 0
for (let i = 0; i < entries.length; i += BATCH) {
  const batch = entries.slice(i, i + BATCH)
  const { error } = await supabase.from('hitchcock_names').insert(batch)
  if (error) {
    console.error(`Batch error at ${i}:`, error.message)
    // Try individual inserts on error
    for (const row of batch) {
      const { error: e2 } = await supabase.from('hitchcock_names').insert(row)
      if (e2 && !e2.message.includes('duplicate')) console.error('Row error:', row.name, e2.message)
    }
  }
  loaded += batch.length
  process.stdout.write(`\rLoaded: ${loaded}/${entries.length}`)
}

// Update source registry
await supabase
  .from('intelligence_sources')
  .update({ entry_count: entries.length, loaded_at: new Date().toISOString() })
  .eq('table_name', 'hitchcock_names')

console.log('\nHitchcock\'s Bible Names load complete')
