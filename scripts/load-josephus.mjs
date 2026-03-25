/**
 * Load Josephus — Antiquities of the Jews + Wars of the Jews into Supabase
 * Source: Project Gutenberg, William Whiston translation (public domain)
 * Run: node scripts/load-josephus.mjs
 */
import { db, fetchGutenberg, parseIntoSections, loadSections, printSummary } from './historical-shared.mjs'

const ANTIQUITIES_URL = 'https://www.gutenberg.org/cache/epub/2848/pg2848.txt'
const WARS_URL = 'https://www.gutenberg.org/cache/epub/2850/pg2850.txt'

// Antiquities: 20 books covering Creation to 66 CE
const ANTIQUITIES_META = {
  1:  { name: 'Antiquities I — Creation to Isaac', start: -2000, end: -1800, kingdoms: ['Patriarchal'], regions: ['Mesopotamia', 'Canaan', 'Egypt'] },
  2:  { name: 'Antiquities II — Jacob to Exodus', start: -1800, end: -1400, kingdoms: ['Egypt'], regions: ['Egypt', 'Canaan'] },
  3:  { name: 'Antiquities III — Wilderness', start: -1400, end: -1360, kingdoms: ['Israel'], regions: ['Sinai'] },
  4:  { name: 'Antiquities IV — Law and Wilderness', start: -1400, end: -1360, kingdoms: ['Israel'], regions: ['Sinai', 'Canaan'] },
  5:  { name: 'Antiquities V — Joshua and Judges', start: -1350, end: -1050, kingdoms: ['Israel', 'Canaan'], regions: ['Canaan'] },
  6:  { name: 'Antiquities VI — Saul', start: -1050, end: -1010, kingdoms: ['Israel', 'Philistia'], regions: ['Canaan'] },
  7:  { name: 'Antiquities VII — David', start: -1010, end: -970, kingdoms: ['Israel'], regions: ['Israel', 'Judah'] },
  8:  { name: 'Antiquities VIII — Solomon', start: -970, end: -930, kingdoms: ['Israel', 'Egypt', 'Phoenicia'], regions: ['Israel', 'Judah'] },
  9:  { name: 'Antiquities IX — Divided Kingdom', start: -930, end: -722, kingdoms: ['Israel', 'Judah', 'Assyria'], regions: ['Israel', 'Judah', 'Assyria'] },
  10: { name: 'Antiquities X — Babylonian Period', start: -722, end: -538, kingdoms: ['Judah', 'Babylon', 'Persia'], regions: ['Judah', 'Babylon'] },
  11: { name: 'Antiquities XI — Persian Period', start: -538, end: -332, kingdoms: ['Persia', 'Judea'], regions: ['Judea', 'Persia'] },
  12: { name: 'Antiquities XII — Ptolemaic/Seleucid', start: -332, end: -166, kingdoms: ['Ptolemaic Egypt', 'Seleucid'], regions: ['Judea', 'Egypt', 'Syria'] },
  13: { name: 'Antiquities XIII — Maccabees', start: -166, end: -76, kingdoms: ['Hasmonean', 'Seleucid'], regions: ['Judea', 'Syria'] },
  14: { name: 'Antiquities XIV — Pompey to Herod', start: -76, end: -37, kingdoms: ['Rome', 'Hasmonean'], regions: ['Judea', 'Rome'] },
  15: { name: 'Antiquities XV — Herod the Great', start: -37, end: -25, kingdoms: ['Rome', 'Herodian'], regions: ['Judea'] },
  16: { name: 'Antiquities XVI — Herod\'s Family', start: -25, end: -12, kingdoms: ['Rome', 'Herodian'], regions: ['Judea'] },
  17: { name: 'Antiquities XVII — Death of Herod', start: -12, end: -4, kingdoms: ['Rome', 'Herodian'], regions: ['Judea'] },
  18: { name: 'Antiquities XVIII — Pilate and John', start: -4, end: 37, kingdoms: ['Rome', 'Herodian'], regions: ['Judea', 'Galilee'] },
  19: { name: 'Antiquities XIX — Caligula and Claudius', start: 37, end: 44, kingdoms: ['Rome'], regions: ['Judea', 'Rome'] },
  20: { name: 'Antiquities XX — Procurators', start: 44, end: 66, kingdoms: ['Rome'], regions: ['Judea'] },
}

// Wars: 7 books covering ~170 BCE to 73 CE
const WARS_META = {
  1: { name: 'Wars I — Maccabees to Herod', start: -170, end: -37, kingdoms: ['Hasmonean', 'Rome'], regions: ['Judea', 'Syria'] },
  2: { name: 'Wars II — Herod to Revolt', start: -37, end: 66, kingdoms: ['Rome', 'Herodian'], regions: ['Judea', 'Galilee'] },
  3: { name: 'Wars III — Galilee Campaign', start: 67, end: 68, kingdoms: ['Rome'], regions: ['Galilee'] },
  4: { name: 'Wars IV — Zealots and Idumeans', start: 68, end: 69, kingdoms: ['Rome'], regions: ['Judea'] },
  5: { name: 'Wars V — Siege of Jerusalem', start: 70, end: 70, kingdoms: ['Rome'], regions: ['Jerusalem'] },
  6: { name: 'Wars VI — Fall of the Temple', start: 70, end: 70, kingdoms: ['Rome'], regions: ['Jerusalem'] },
  7: { name: 'Wars VII — Masada', start: 71, end: 73, kingdoms: ['Rome'], regions: ['Judea', 'Masada'] },
}

function detectAntiquitiesBook(line) {
  const upper = line.trim().toUpperCase()
  if (upper.length > 100 || upper.length < 5) return null
  const m = upper.match(/BOOK\s+([IVXLC]+)/)
  if (!m) return null
  const roman = m[1]
  const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
    'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20 }
  return romanMap[roman] || null
}

function detectWarsBook(line) {
  return detectAntiquitiesBook(line)
}

const supabase = db()

// Load Antiquities
let antiquitiesText
try {
  antiquitiesText = await fetchGutenberg(ANTIQUITIES_URL, 'Josephus — Antiquities of the Jews')
} catch (e) {
  console.error('Failed to fetch Antiquities:', e.message)
  process.exit(1)
}

console.log(`Antiquities: ${antiquitiesText.length} chars`)

const antiquitiesSections = parseIntoSections(antiquitiesText, {
  sourceName: 'josephus_antiquities',
  defaultBook: 1,
  bookMeta: ANTIQUITIES_META,
  bookDetector: detectAntiquitiesBook,
})

await loadSections(supabase, antiquitiesSections, 'Josephus Antiquities')
printSummary(antiquitiesSections, 'Josephus — Antiquities of the Jews')

// Load Wars
let warsText
try {
  warsText = await fetchGutenberg(WARS_URL, 'Josephus — Wars of the Jews')
} catch (e) {
  console.error('Failed to fetch Wars:', e.message)
  process.exit(1)
}

console.log(`\nWars: ${warsText.length} chars`)

const warsSections = parseIntoSections(warsText, {
  sourceName: 'josephus_wars',
  defaultBook: 1,
  bookMeta: WARS_META,
  bookDetector: detectWarsBook,
})

await loadSections(supabase, warsSections, 'Josephus Wars')
printSummary(warsSections, 'Josephus — Wars of the Jews')

console.log(`\nTotal Josephus: ${antiquitiesSections.length + warsSections.length} sections`)
