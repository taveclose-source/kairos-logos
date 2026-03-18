const BOOK_START: Record<string, number> = {
  'Genesis':0,'Exodus':1533,'Leviticus':2746,'Numbers':3605,
  'Deuteronomy':4893,'Joshua':5852,'Judges':6510,'Ruth':7128,
  '1 Samuel':7213,'2 Samuel':8024,'1 Kings':8719,'2 Kings':9536,
  '1 Chronicles':10255,'2 Chronicles':11197,'Ezra':12019,
  'Nehemiah':12299,'Esther':12705,'Job':12872,'Psalms':13942,
  'Proverbs':16403,'Ecclesiastes':17318,'Song of Solomon':17540,
  'Isaiah':17657,'Jeremiah':18949,'Lamentations':20313,
  'Ezekiel':20467,'Daniel':21740,'Hosea':22097,'Joel':22294,
  'Amos':22367,'Obadiah':22513,'Jonah':22534,'Micah':22582,
  'Nahum':22687,'Habakkuk':22734,'Zephaniah':22790,'Haggai':22843,
  'Zechariah':22881,'Malachi':23092,'Matthew':23147,'Mark':24215,
  'Luke':24891,'John':26042,'Acts':26921,'Romans':27928,
  '1 Corinthians':28361,'2 Corinthians':28798,'Galatians':29055,
  'Ephesians':29204,'Philippians':29359,'Colossians':29463,
  '1 Thessalonians':29558,'2 Thessalonians':29647,'1 Timothy':29694,
  '2 Timothy':29807,'Titus':29890,'Philemon':29936,'Hebrews':29961,
  'James':30264,'1 Peter':30372,'2 Peter':30477,'1 John':30538,
  '2 John':30643,'3 John':30656,'Jude':30671,'Revelation':30696
}

const TOTAL_VERSES = 31101

export function getBookPosition(book: string): number {
  return BOOK_START[book] ?? 0
}

export function getShuffleDuration(
  fromBook: string | null,
  toBook: string
): number {
  const fromPos = fromBook ? (BOOK_START[fromBook] ?? 0) : 0
  const toPos = BOOK_START[toBook] ?? 0
  const distance = Math.abs(toPos - fromPos) / TOTAL_VERSES
  // 150ms min (same book), 2000ms max (full Bible)
  return Math.round(150 + (distance * 1850))
}

export function getShuffleDirection(
  fromBook: string | null,
  toBook: string
): 'forward' | 'back' {
  const fromPos = fromBook ? (BOOK_START[fromBook] ?? 0) : 0
  const toPos = BOOK_START[toBook] ?? 0
  return toPos >= fromPos ? 'forward' : 'back'
}

export function getLastRead(): { book: string; chapter: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('logos_last_read')
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export function saveLastRead(book: string, chapter: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem('logos_last_read', JSON.stringify({ book, chapter }))
}
