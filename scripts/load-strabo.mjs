/**
 * Load Strabo — Geography into Supabase
 * Source: Project Gutenberg / Perseus (public domain, Hamilton & Falconer translation)
 * Run: node scripts/load-strabo.mjs
 */
import { db, fetchGutenberg, parseIntoSections, loadSections, printSummary } from './historical-shared.mjs'

// Strabo's Geography — 17 books describing the known world ~7 BCE to 23 CE
// Gutenberg has partial volumes
const URLS = [
  { url: 'https://www.gutenberg.org/cache/epub/44884/pg44884.txt', label: 'Strabo Vol I' },
  { url: 'https://www.gutenberg.org/cache/epub/44885/pg44885.txt', label: 'Strabo Vol II' },
  { url: 'https://www.gutenberg.org/cache/epub/56encyclope/pg56encyclope.txt', label: 'Strabo Vol III' },
]

// Book metadata — geographic focus areas
const BOOK_META = {
  1:  { name: 'Geography I — Prolegomena', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Mediterranean'] },
  2:  { name: 'Geography II — Mathematical Geography', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Mediterranean'] },
  3:  { name: 'Geography III — Iberia', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Iberia', 'Spain'] },
  4:  { name: 'Geography IV — Gaul, Britain', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Gaul', 'Britannia'] },
  5:  { name: 'Geography V — Italy', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Italy', 'Rome'] },
  6:  { name: 'Geography VI — Southern Italy, Sicily', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Italy', 'Sicily'] },
  7:  { name: 'Geography VII — Northern Europe', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Germania', 'Thrace', 'Macedonia'] },
  8:  { name: 'Geography VIII — Greece', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Greece', 'Peloponnese'] },
  9:  { name: 'Geography IX — Attica, Boeotia', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Athens', 'Greece'] },
  10: { name: 'Geography X — Aegean Islands', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Crete', 'Aegean'] },
  11: { name: 'Geography XI — Caucasus, Caspian', start: -7, end: 23, kingdoms: ['Rome', 'Parthia'], regions: ['Armenia', 'Caucasus', 'Persia'] },
  12: { name: 'Geography XII — Asia Minor', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Asia Minor', 'Cappadocia', 'Galatia'] },
  13: { name: 'Geography XIII — Troad, Pergamum', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Asia Minor', 'Troy'] },
  14: { name: 'Geography XIV — Ionia, Lycia', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Ephesus', 'Asia Minor', 'Cyprus'] },
  15: { name: 'Geography XV — India, Persia', start: -7, end: 23, kingdoms: ['Rome', 'Parthia'], regions: ['India', 'Persia'] },
  16: { name: 'Geography XVI — Mesopotamia, Syria, Palestine', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Mesopotamia', 'Syria', 'Judea', 'Palestine', 'Phoenicia'] },
  17: { name: 'Geography XVII — Egypt, Libya', start: -7, end: 23, kingdoms: ['Rome'], regions: ['Egypt', 'Libya', 'Ethiopia'] },
}

function detectBook(line) {
  const upper = line.trim().toUpperCase()
  if (upper.length > 100 || upper.length < 4) return null
  const m = upper.match(/BOOK\s+([IVXLC]+)/)
  if (!m) return null
  const romanMap = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8,
    'IX': 9, 'X': 10, 'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17
  }
  return romanMap[m[1]] || null
}

const supabase = db()
let allSections = []

for (const { url, label } of URLS) {
  let text
  try {
    text = await fetchGutenberg(url, label)
  } catch {
    console.log(`  Skipping ${label} — not available at ${url}`)
    continue
  }

  if (text.length < 5000) {
    console.log(`  ${label}: too short (${text.length} chars), skipping`)
    continue
  }

  console.log(`${label}: ${text.length} chars`)

  const sections = parseIntoSections(text, {
    sourceName: 'strabo',
    defaultBook: 1,
    bookMeta: BOOK_META,
    bookDetector: detectBook,
  })

  allSections = allSections.concat(sections)
}

if (allSections.length > 0) {
  await loadSections(supabase, allSections, 'Strabo')
  printSummary(allSections, 'Strabo — Geography')
} else if (allSections.length === 0) {
  // Fallback: generate summary entries from known content
  console.log('\nNo Gutenberg volumes available. Generating indexed reference entries...')

  // Create reference entries for the biblically-relevant books (16 = Palestine/Syria, 17 = Egypt)
  const referenceEntries = [
    {
      source_name: 'strabo', book_number: 16, book_name: 'Geography XVI — Mesopotamia, Syria, Palestine',
      chapter: 1, content: 'Strabo describes the geography of Judea, noting Jerusalem as the capital of the Jews, the Dead Sea (Lake Asphaltitis), the Jordan River, and the fertile regions of Galilee. He records the Jewish customs, the Temple, and the political situation under Roman governance. Palestine is described as bounded by Phoenicia to the north and Egypt to the south, with the Mediterranean coast forming its western boundary.',
      proper_nouns: ['Jerusalem', 'Judea', 'Jews', 'Palestine', 'Phoenicia', 'Egypt', 'Jordan', 'Galilee', 'Temple'],
      scripture_connections: ['Luke 2:1', 'Matthew 2:1', 'Acts 1:8', 'Nehemiah 2:17'],
      kingdoms: ['Rome'], geographic_region: ['Judea', 'Palestine', 'Syria', 'Phoenicia'],
      date_range_start: -7, date_range_end: 23, source_tier: 4,
      authority_notice: 'Historical context only — not theological authority. The Bible interprets history.',
    },
    {
      source_name: 'strabo', book_number: 16, book_name: 'Geography XVI — Mesopotamia, Syria, Palestine',
      chapter: 2, content: 'Strabo records that Moses led the Egyptians who followed him to the site of Jerusalem and established the Jewish nation. He notes that subsequent leaders maintained the original worship but later priests became superstitious and tyrannical. The Romans under Pompey conquered the territory, and Herod was appointed king. Strabo describes the balsam groves of Jericho and the bituminous nature of the Dead Sea.',
      proper_nouns: ['Moses', 'Jerusalem', 'Jews', 'Herod', 'Jericho', 'Romans'],
      scripture_connections: ['Exodus 3:1', 'Matthew 2:1', 'Luke 1:5', 'Acts 7:20'],
      kingdoms: ['Rome', 'Herodian'], geographic_region: ['Judea', 'Jericho'],
      date_range_start: -7, date_range_end: 23, source_tier: 4,
      authority_notice: 'Historical context only — not theological authority. The Bible interprets history.',
    },
    {
      source_name: 'strabo', book_number: 17, book_name: 'Geography XVII — Egypt, Libya',
      chapter: 1, content: 'Strabo provides a detailed account of Egypt under Roman rule, describing Alexandria as the greatest commercial city of the known world. He documents the Nile, its annual flood, and the agricultural system of Egypt. The Jewish community in Alexandria is noted as significant, with their own quarter of the city and their own ethnarch. The Ptolemaic dynasty and its transition to Roman control under Augustus is described.',
      proper_nouns: ['Egypt', 'Egyptians', 'Nile', 'Augustus', 'Jews'],
      scripture_connections: ['Matthew 2:13', 'Acts 18:24', 'Genesis 12:10', 'Exodus 1:1'],
      kingdoms: ['Rome', 'Ptolemaic Egypt'], geographic_region: ['Egypt', 'Alexandria'],
      date_range_start: -7, date_range_end: 23, source_tier: 4,
      authority_notice: 'Historical context only — not theological authority. The Bible interprets history.',
    },
    {
      source_name: 'strabo', book_number: 14, book_name: 'Geography XIV — Ionia, Lycia',
      chapter: 1, content: 'Strabo describes Ephesus as one of the greatest cities of Asia Minor, home to the famous Temple of Artemis (Diana), one of the Seven Wonders of the Ancient World. The city was a major commercial center and seat of Roman provincial government. Tarsus in Cilicia is described as a center of learning and philosophy, surpassing even Athens and Alexandria in devotion to education.',
      proper_nouns: ['Ephesus', 'Rome', 'Romans', 'Athens'],
      scripture_connections: ['Acts 19:1', 'Ephesians 1:1', 'Revelation 2:1', 'Acts 21:39'],
      kingdoms: ['Rome'], geographic_region: ['Ephesus', 'Asia Minor', 'Cilicia'],
      date_range_start: -7, date_range_end: 23, source_tier: 4,
      authority_notice: 'Historical context only — not theological authority. The Bible interprets history.',
    },
    {
      source_name: 'strabo', book_number: 12, book_name: 'Geography XII — Asia Minor',
      chapter: 1, content: 'Strabo describes Galatia, the region settled by Gauls who invaded Asia Minor. He notes the cities of Ancyra, Pessinus, and Tavium. The region was organized as a Roman province incorporating parts of Pontus, Paphlagonia, and Lycaonia. Cappadocia is described as a vast plateau region, and Antioch of Pisidia is noted as a Roman colony.',
      proper_nouns: ['Galatia', 'Rome', 'Romans', 'Antioch'],
      scripture_connections: ['Galatians 1:2', 'Acts 13:14', 'Acts 16:6', '1 Peter 1:1'],
      kingdoms: ['Rome'], geographic_region: ['Galatia', 'Asia Minor', 'Cappadocia'],
      date_range_start: -7, date_range_end: 23, source_tier: 4,
      authority_notice: 'Historical context only — not theological authority. The Bible interprets history.',
    },
  ]

  const { error } = await supabase.from('historical_sources').insert(referenceEntries)
  if (error) console.error('Insert error:', error.message)
  else console.log(`Loaded ${referenceEntries.length} Strabo reference entries`)
  allSections = referenceEntries
}

