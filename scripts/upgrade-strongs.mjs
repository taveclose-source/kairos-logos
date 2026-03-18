import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Files are .js with "var strongsXxxDictionary = {...}" wrapper
const GREEK = 'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js'
const HEBREW = 'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js'

function parseJsDict(text) {
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1))
}

async function upgrade(url, prefix) {
  console.log(`\nFetching ${prefix} data from OpenScriptures...`)
  const res = await fetch(url)
  const text = await res.text()
  const data = parseJsDict(text)
  const nums = Object.keys(data)
  console.log(`${nums.length} entries found`)

  // Fetch existing data for comparison
  const { data: existing } = await supabase
    .from('strongs_entries')
    .select('strongs_number, kjv_usage, definition, transliteration')
    .like('strongs_number', `${prefix}%`)
    .limit(10000)

  const existingMap = {}
  existing?.forEach(e => existingMap[e.strongs_number] = e)

  const entries = nums.map(num => {
    const e = data[num]
    const snum = num.startsWith(prefix) ? num : `${prefix}${num}`
    const current = existingMap[snum] || {}

    // INTEGRITY: keep whichever kjv_usage is longer
    const newKjv = e.kjv_def || e.kjv_usage || null
    const oldKjv = current.kjv_usage || null
    const keepKjv = (newKjv && oldKjv)
      ? (newKjv.length >= oldKjv.length ? newKjv : oldKjv)
      : (newKjv || oldKjv)

    // INTEGRITY: keep whichever definition is longer
    const newDef = e.strongs_def || null
    const oldDef = current.definition || null
    const keepDef = (newDef && oldDef)
      ? (newDef.length >= oldDef.length ? newDef : oldDef)
      : (newDef || oldDef)

    return {
      strongs_number: snum,
      testament: prefix === 'G' ? 'NT' : 'OT',
      original_word: e.lemma || null,
      transliteration: current.transliteration || e.translit || null,
      pronunciation: e.pronounce || null,
      part_of_speech: e.pos || null,
      definition: keepDef,
      kjv_usage: keepKjv,
      derivation: e.derivation || null,
      outline_of_biblical_usage: Array.isArray(e.outline_of_biblical_usage)
        ? e.outline_of_biblical_usage.join('\n')
        : (e.outline_of_biblical_usage || null),
      strongs_def: e.strongs_def || null,
      root_words: e.see ? JSON.stringify(e.see) : null,
    }
  })

  let updated = 0
  for (let i = 0; i < entries.length; i += 100) {
    const batch = entries.slice(i, i + 100)
    const { error } = await supabase
      .from('strongs_entries')
      .upsert(batch, { onConflict: 'strongs_number' })
    if (error) {
      console.error(`\nBatch error at ${i}:`, error.message)
    } else {
      updated += batch.length
      process.stdout.write(`\r${prefix}: ${updated}/${entries.length}`)
    }
  }
  console.log(`\n${prefix} upgrade complete.`)
}

await upgrade(GREEK, 'G')
await upgrade(HEBREW, 'H')

// Verify G976
const { data: g976 } = await supabase
  .from('strongs_entries')
  .select('strongs_number, kjv_usage, outline_of_biblical_usage, derivation')
  .eq('strongs_number', 'G976')
  .single()

console.log('\nG976 after upgrade:')
console.log('kjv_usage:', g976?.kjv_usage)
console.log('outline:', g976?.outline_of_biblical_usage?.slice(0, 200))
console.log('derivation:', g976?.derivation)
