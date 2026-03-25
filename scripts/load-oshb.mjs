import { createClient } from '@supabase/supabase-js'
import https from 'https'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// File names from https://github.com/openscriptures/morphhb/tree/master/wlc
const BOOK_MAP = {
  'Gen':'Genesis','Exod':'Exodus','Lev':'Leviticus','Num':'Numbers',
  'Deut':'Deuteronomy','Josh':'Joshua','Judg':'Judges','Ruth':'Ruth',
  '1Sam':'1 Samuel','2Sam':'2 Samuel','1Kgs':'1 Kings','2Kgs':'2 Kings',
  '1Chr':'1 Chronicles','2Chr':'2 Chronicles','Ezra':'Ezra',
  'Neh':'Nehemiah','Esth':'Esther','Job':'Job','Ps':'Psalms',
  'Prov':'Proverbs','Eccl':'Ecclesiastes','Song':'Song of Solomon',
  'Isa':'Isaiah','Jer':'Jeremiah','Lam':'Lamentations',
  'Ezek':'Ezekiel','Dan':'Daniel','Hos':'Hosea','Joel':'Joel',
  'Amos':'Amos','Obad':'Obadiah','Jonah':'Jonah','Mic':'Micah',
  'Nah':'Nahum','Hab':'Habakkuk','Zeph':'Zephaniah','Hag':'Haggai',
  'Zech':'Zechariah','Mal':'Malachi'
}

const OSHB_BOOKS = Object.keys(BOOK_MAP)

function parseMorphHeb(morph) {
  if (!morph) return {}
  const result = {}
  if (!morph.startsWith('H') && !morph.startsWith('A')) return result
  const code = morph.slice(1)
  const posMap = {N:'noun',V:'verb',A:'adjective',P:'pronoun',
    R:'preposition',C:'conjunction',T:'article',I:'interrogative',
    D:'adverb',E:'interjection'}
  result.part_of_speech = posMap[code[0]] || code[0]

  if (code[0] === 'N' && code.length >= 4) {
    const genderMap = {c:'common',m:'masculine',f:'feminine'}
    const numMap = {s:'singular',p:'plural',d:'dual'}
    const stateMap = {a:'absolute',c:'construct',d:'determined'}
    result.gender = genderMap[code[1]] || null
    result.number = numMap[code[2]] || null
    result.state = stateMap[code[3]] || null
  }
  if (code[0] === 'V' && code.length >= 2) {
    result.stem = code.slice(1, 4) || null
  }
  return result
}

function fetchBook(abbr) {
  return new Promise((resolve, reject) => {
    const url = `https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/${abbr}.xml`
    https.get(url, res => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return }
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function parseXML(xml, bookName) {
  const entries = []
  const verseRegex = /<verse osisID="[^.]+\.(\d+)\.(\d+)"[^>]*>([\s\S]*?)<\/verse>/g
  let verseMatch

  while ((verseMatch = verseRegex.exec(xml)) !== null) {
    const chapter = parseInt(verseMatch[1])
    const verse = parseInt(verseMatch[2])
    const verseContent = verseMatch[3]

    const wordRegex = /<w[^>]*lemma="([^"]*)"[^>]*morph="([^"]*)"[^>]*>([^<]*)<\/w>/g
    let wordMatch
    let pos = 1

    while ((wordMatch = wordRegex.exec(verseContent)) !== null) {
      const lemmaRaw = wordMatch[1]
      const morph = wordMatch[2]
      const hebrew = wordMatch[3].trim()

      let strongs = null
      const strongsMatch = lemmaRaw.match(/strong:([HG]\d+)/i)
      if (strongsMatch) {
        strongs = strongsMatch[1].toUpperCase()
      } else {
        // Try plain number format
        const numMatch = lemmaRaw.match(/(\d+)/)
        if (numMatch) strongs = 'H' + numMatch[1]
      }

      const morphParsed = parseMorphHeb(morph)

      entries.push({
        book: bookName,
        chapter,
        verse,
        word_position: pos++,
        word_text: '',
        original_text: hebrew || null,
        normalized_text: hebrew || null,
        strongs_number: strongs,
        morph_code: morph || null,
        testament: 'OT',
        ...morphParsed
      })
    }
  }
  return entries
}

let totalLoaded = 0

for (const abbr of OSHB_BOOKS) {
  const bookName = BOOK_MAP[abbr]
  process.stdout.write(`\nLoading ${bookName}...`)

  try {
    const xml = await fetchBook(abbr)
    const entries = parseXML(xml, bookName)

    for (let i = 0; i < entries.length; i += 200) {
      const batch = entries.slice(i, i + 200)
      const { error } = await supabase
        .from('word_morphology')
        .upsert(batch, { onConflict: 'book,chapter,verse,word_position' })
      if (error) console.error(`\n${bookName} batch error:`, error.message)
      else totalLoaded += batch.length
    }
    process.stdout.write(` ${entries.length} words`)
  } catch (e) {
    console.error(`\nFailed ${bookName}:`, e.message)
  }
}

console.log(`\n\nOT load complete. Total words loaded: ${totalLoaded}`)

const { count } = await supabase
  .from('word_morphology')
  .select('*', { count: 'exact', head: true })
  .eq('testament', 'OT')
console.log(`OT word_morphology count: ${count}`)
