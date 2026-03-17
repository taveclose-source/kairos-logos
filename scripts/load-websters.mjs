import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('Fetching Webster\'s dictionary...')
const response = await fetch('https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/master/dictionary.json')
const data = await response.json()

const entries = Object.entries(data).map(([word, def]) => ({
  word: word.toLowerCase(),
  definition: typeof def === 'string' ? def : JSON.stringify(def),
  part_of_speech: null,
  etymology: null
}))

console.log(`Parsed ${entries.length} entries. Loading in batches of 500...`)

const batchSize = 500
for (let i = 0; i < entries.length; i += batchSize) {
  const batch = entries.slice(i, i + batchSize)
  const { error } = await supabase
    .from('websters_1828')
    .upsert(batch, { onConflict: 'word' })
  if (error) console.error('Batch error:', error.message)
  else console.log(`Loaded ${Math.min(i + batchSize, entries.length)} / ${entries.length}`)
}

console.log('Webster\'s 1828 load complete')
