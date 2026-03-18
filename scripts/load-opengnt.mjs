import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BOOK_MAP = {
  40:'Matthew',41:'Mark',42:'Luke',43:'John',44:'Acts',
  45:'Romans',46:'1 Corinthians',47:'2 Corinthians',
  48:'Galatians',49:'Ephesians',50:'Philippians',
  51:'Colossians',52:'1 Thessalonians',53:'2 Thessalonians',
  54:'1 Timothy',55:'2 Timothy',56:'Titus',57:'Philemon',
  58:'Hebrews',59:'James',60:'1 Peter',61:'2 Peter',
  62:'1 John',63:'2 John',64:'3 John',65:'Jude',66:'Revelation'
}

function parseMorph(code) {
  // Robinson's: e.g. N-NSF, V-PAI-3S, A-GSM
  const result = { part_of_speech: null, tense: null, voice: null, mood: null, person: null, number: null, gender: null, case_greek: null }
  if (!code) return result

  const parts = code.split('-')
  const pos = parts[0]
  result.part_of_speech = pos

  if (pos === 'V' && parts.length >= 2) {
    const vp = parts[1] || ''
    result.tense = vp[0] || null
    result.voice = vp[1] || null
    result.mood = vp[2] || null
    if (parts[2]) {
      result.person = parts[2][0] || null
      result.number = parts[2][1] || null
    }
  } else if (parts.length >= 2) {
    const np = parts[1] || ''
    result.case_greek = np[0] || null
    result.number = np[1] || null
    result.gender = np[2] || null
  }

  return result
}

function extractBracket(text) {
  // Extract content between 〔 and 〕
  const m = text.match(/〔(.+?)〕/)
  return m ? m[1] : text
}

console.log('Reading OpenGNT CSV...')
const csv = readFileSync(new URL('./OpenGNT_keyedFeatures.csv', import.meta.url), 'utf-8')
const lines = csv.split('\n').slice(1) // skip header

const entries = []
let skipped = 0

for (const line of lines) {
  if (!line.trim()) continue
  const cols = line.split('\t')
  if (cols.length < 9) { skipped++; continue }

  // Column 5: 〔book｜chapter｜verse〕
  const bcv = extractBracket(cols[4])
  const [bookNum, chapter, verse] = bcv.split('｜').map(Number)
  const bookName = BOOK_MAP[bookNum]
  if (!bookName) { skipped++; continue }

  // Column 1: sort position (word position within verse)
  const sortPos = parseInt(cols[0])

  // Column 8: 〔TANTT〕 — contains word=Strong's=morph
  const tantt = extractBracket(cols[7])
  // Parse first variant: BIMNRSTWH=Βίβλος=G0976=N-NSF;
  const variant = tantt.split(';')[0]
  const vParts = variant.split('=')
  if (vParts.length < 4) { skipped++; continue }

  const originalText = vParts[1]
  let strongsNum = vParts[2]
  const morphCode = vParts[3]

  // Normalize Strong's: G0976 → G976
  if (strongsNum) strongsNum = strongsNum.replace(/^([GH])0+/, '$1')

  // Column 9: 〔MounceGloss｜TyndaleHouseGloss｜...〕
  const glosses = extractBracket(cols[8])
  const englishGloss = glosses.split('｜')[0] || null

  const morph = parseMorph(morphCode)

  // Calculate word position within verse
  // We'll use a counter per verse
  entries.push({
    book: bookName,
    chapter,
    verse,
    word_position: sortPos,
    original_text: originalText,
    strongs_number: strongsNum,
    morph_code: morphCode,
    word_text: englishGloss,
    lemma: originalText,
    testament: 'NT',
    ...morph,
  })
}

console.log(`Parsed ${entries.length} words (skipped ${skipped})`)

// Insert in batches of 500
for (let i = 0; i < entries.length; i += 500) {
  const batch = entries.slice(i, i + 500)
  const { error } = await supabase.from('word_morphology').insert(batch)
  if (error) {
    console.error(`\nBatch error at ${i}:`, error.message)
    // Try smaller batch on error
    for (const row of batch) {
      const { error: e2 } = await supabase.from('word_morphology').insert(row)
      if (e2 && !e2.message.includes('duplicate')) console.error('Row error:', e2.message)
    }
  } else {
    process.stdout.write(`\rInserted: ${Math.min(i + 500, entries.length)}/${entries.length}`)
  }
}

console.log('\nOpenGNT load complete')
