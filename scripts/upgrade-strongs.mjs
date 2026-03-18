import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const greekUrl = 'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js'
const hebrewUrl = 'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js'

function parseJsDict(text) {
  // Strip "var strongsXxxDictionary = " prefix and trailing semicolons
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.lastIndexOf('}')
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('Could not find JSON in JS file')
  return JSON.parse(text.slice(jsonStart, jsonEnd + 1))
}

async function upgradeEntries(url, prefix) {
  console.log(`Fetching ${prefix} data from ${url}...`)
  const res = await fetch(url)
  const text = await res.text()
  const data = parseJsDict(text)

  const entries = Object.entries(data).map(([num, entry]) => ({
    strongs_number: num.startsWith(prefix) ? num : `${prefix}${num}`,
    testament: prefix === 'G' ? 'NT' : 'OT',
    original_word: entry.lemma || null,
    transliteration: entry.translit || null,
    pronunciation: entry.pronounce || null,
    part_of_speech: entry.pos || null,
    strongs_def: entry.strongs_def || null,
    outline_of_biblical_usage: entry.outline_of_biblical_usage
      ? (Array.isArray(entry.outline_of_biblical_usage)
          ? entry.outline_of_biblical_usage.join('\n')
          : entry.outline_of_biblical_usage)
      : null,
    derivation: entry.derivation || null,
    kjv_usage: entry.kjv_def || entry.kjv_usage || null,
    root_words: entry.see ? JSON.stringify(entry.see) : null,
  }))

  console.log(`Parsed ${entries.length} ${prefix} entries`)

  for (let i = 0; i < entries.length; i += 200) {
    const batch = entries.slice(i, i + 200)
    const { error } = await supabase
      .from('strongs_entries')
      .upsert(batch, { onConflict: 'strongs_number' })
    if (error) console.error('Error:', error.message)
    else console.log(`${prefix}: ${Math.min(i + 200, entries.length)}/${entries.length}`)
  }
}

await upgradeEntries(greekUrl, 'G')
await upgradeEntries(hebrewUrl, 'H')
console.log('Upgrade complete')
