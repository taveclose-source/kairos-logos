/**
 * Build translation_word_index from existing Twi translation verses
 * Parses all verses with Twi text, extracts unique words, links to:
 * - KJV English equivalents (via verse_words positional alignment)
 * - Strong's numbers
 * - Christaller entries (twi_lexicon)
 * - Glossary lock status (twi_glossary)
 *
 * Run: node scripts/build-twi-word-index.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Paginated fetch — Supabase caps SELECT at 1000 rows by default
async function fetchAll(table, select, filters) {
  const PAGE = 1000
  let all = []
  let offset = 0
  while (true) {
    let q = supabase.from(table).select(select).range(offset, offset + PAGE - 1)
    if (filters) q = filters(q)
    const { data, error } = await q
    if (error) { console.error(`fetchAll ${table}:`, error.message); break }
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return all
}

console.log('Building Twi translation word index...\n')

// 1. Fetch all verses with Twi translations
console.log('Step 1: Fetching Twi translation verses...')
const twiVerses = await fetchAll('bible_verses', 'id, book_id, chapter, verse, kjv_text, twi_text',
  q => q.eq('has_twi', true).not('twi_text', 'is', null))
console.log(`  Found ${twiVerses.length} verses with Twi translations`)

// 2. Get book names for each book_id
const bookIds = Array.from(new Set(twiVerses.map(v => v.book_id)))
const { data: books } = await supabase
  .from('bible_books')
  .select('id, book_name')
  .in('id', bookIds)
const bookMap = {}
for (const b of books || []) bookMap[b.id] = b.book_name

// 3. Fetch glossary for lock status
console.log('Step 2: Fetching glossary...')
const { data: glossary } = await supabase
  .from('twi_glossary')
  .select('kjv_term, twi_term, locked, strongs_number')

const glossaryMap = {}
for (const g of glossary || []) {
  if (g.twi_term) {
    glossaryMap[g.twi_term.toLowerCase()] = {
      kjv: g.kjv_term,
      locked: g.locked,
      strongs: g.strongs_number,
    }
  }
}
console.log(`  ${glossary?.length || 0} glossary terms loaded`)

// 4. Fetch Christaller entries for matching
console.log('Step 3: Fetching Christaller lexicon...')
const lexicon = await fetchAll('twi_lexicon', 'id, twi_headword, twi_normalized')

const lexiconMap = {}
for (const entry of lexicon) {
  const key = (entry.twi_normalized || entry.twi_headword).toLowerCase()
  lexiconMap[key] = entry.id
}
console.log(`  ${lexicon.length} lexicon entries loaded`)

// 5. Fetch English-Twi entries
console.log('Step 4: Fetching English-Twi lexicon...')
const engTwi = await fetchAll('english_twi_lexicon', 'id, english_headword, twi_equivalents')

// Build reverse map: twi word → english_twi_lexicon id
const engTwiReverseMap = {}
for (const entry of engTwi) {
  for (const tw of entry.twi_equivalents || []) {
    engTwiReverseMap[tw.toLowerCase()] = entry.id
  }
}
console.log(`  ${engTwi.length} English-Twi entries loaded (${Object.keys(engTwiReverseMap).length} reverse keys)`)

// 6. Fetch verse_words for Strong's alignment
console.log('Step 5: Fetching verse words for Strong\'s alignment...')
const verseLookups = twiVerses.map(v => ({
  book: bookMap[v.book_id],
  chapter: v.chapter,
  verse: v.verse,
}))

// Batch fetch verse_words for the books/chapters that have Twi
const twiBooks = Array.from(new Set(verseLookups.map(v => v.book)))
const verseWordsMap = {} // "book-chapter-verse" → [{word_text, strongs_number}]

for (const bookName of twiBooks) {
  const chapters = Array.from(new Set(
    verseLookups.filter(v => v.book === bookName).map(v => v.chapter)
  ))
  for (const ch of chapters) {
    const { data: vw } = await supabase
      .from('verse_words')
      .select('verse, word_position, word_text, strongs_number')
      .eq('book', bookName)
      .eq('chapter', ch)
      .order('word_position')
    for (const w of vw || []) {
      const key = `${bookName}-${ch}-${w.verse}`
      if (!verseWordsMap[key]) verseWordsMap[key] = []
      verseWordsMap[key].push(w)
    }
  }
}
console.log(`  Loaded verse_words for ${Object.keys(verseWordsMap).length} verses`)

// 7. Parse all Twi words and build the index
console.log('\nStep 6: Building word index...')

// Word tracking
const wordIndex = {} // normalized twi word → { ...data }

function cleanTwiWord(w) {
  return w.replace(/[^a-zA-ZɔɛɲŋàáèéìíòóùúâêîôûãẽĩõũƆƐ'-]/g, '').trim()
}

function normalizeTwi(w) {
  return w.toLowerCase()
    .replace(/[àáâã]/g, 'a')
    .replace(/[èéêẽ]/g, 'e')
    .replace(/[ìíî]/g, 'i')
    .replace(/[òóôõ]/g, 'o')
    .replace(/[ùúû]/g, 'u')
}

for (const v of twiVerses) {
  const bookName = bookMap[v.book_id] || 'Unknown'
  const twiWords = v.twi_text.split(/\s+/).map(cleanTwiWord).filter(w => w.length >= 2)
  const verseKey = `${bookName}-${v.chapter}-${v.verse}`
  const englishWords = verseWordsMap[verseKey] || []

  for (let i = 0; i < twiWords.length; i++) {
    const tw = twiWords[i]
    const normalized = normalizeTwi(tw)
    const lower = tw.toLowerCase()

    if (!wordIndex[normalized]) {
      wordIndex[normalized] = {
        twi_word: tw,
        twi_normalized: normalized,
        kjv_english_word: null,
        strongs_number: null,
        twi_lexicon_id: null,
        english_twi_lexicon_id: null,
        is_locked_term: false,
        glossary_approved_rendering: null,
        locked_by: null,
        occurrence_count: 0,
        book_occurrences: {},
        verse_ids: [],
      }
    }

    const entry = wordIndex[normalized]
    entry.occurrence_count++
    entry.book_occurrences[bookName] = (entry.book_occurrences[bookName] || 0) + 1
    if (entry.verse_ids.length < 100) entry.verse_ids.push(v.id)

    // Try positional alignment for English/Strong's linkage
    // Use proportional position mapping
    if (!entry.kjv_english_word && englishWords.length > 0) {
      const ratio = twiWords.length > 0 ? i / twiWords.length : 0
      const engIdx = Math.min(Math.floor(ratio * englishWords.length), englishWords.length - 1)
      const engWord = englishWords[engIdx]
      if (engWord) {
        entry.kjv_english_word = engWord.word_text
        if (engWord.strongs_number) entry.strongs_number = engWord.strongs_number
      }
    }

    // Link to Christaller lexicon
    if (!entry.twi_lexicon_id) {
      entry.twi_lexicon_id = lexiconMap[lower] || lexiconMap[normalized] || null
    }

    // Link to English-Twi lexicon
    if (!entry.english_twi_lexicon_id) {
      entry.english_twi_lexicon_id = engTwiReverseMap[lower] || null
    }

    // Check glossary lock status
    const glossEntry = glossaryMap[lower]
    if (glossEntry) {
      entry.is_locked_term = glossEntry.locked || false
      entry.glossary_approved_rendering = tw
      entry.locked_by = glossEntry.locked ? 'Tave Sr.' : null
      if (glossEntry.strongs && !entry.strongs_number) {
        entry.strongs_number = glossEntry.strongs
      }
      if (glossEntry.kjv && !entry.kjv_english_word) {
        entry.kjv_english_word = glossEntry.kjv
      }
    }
  }
}

const allWords = Object.values(wordIndex)
console.log(`  Unique Twi words: ${allWords.length}`)
console.log(`  With lexicon link: ${allWords.filter(w => w.twi_lexicon_id).length}`)
console.log(`  With Strong's link: ${allWords.filter(w => w.strongs_number).length}`)
console.log(`  Locked terms: ${allWords.filter(w => w.is_locked_term).length}`)

// 8. Insert into translation_word_index
console.log('\nStep 7: Loading into Supabase...')
const BATCH = 200
let loaded = 0
for (let i = 0; i < allWords.length; i += BATCH) {
  const batch = allWords.slice(i, i + BATCH)
  const { error } = await supabase.from('translation_word_index').insert(batch)
  if (error) {
    console.error(`Batch error at ${i}:`, error.message)
    for (const row of batch) {
      const { error: e2 } = await supabase.from('translation_word_index').insert(row)
      if (e2) console.error(`  Word error (${row.twi_word}):`, e2.message)
    }
  }
  loaded += batch.length
  process.stdout.write(`\rLoaded: ${loaded}/${allWords.length}`)
}

console.log(`\n\nTranslation word index complete: ${allWords.length} unique words indexed`)
