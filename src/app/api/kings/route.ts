import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Approximate BCE date ranges for OT books (negative = BCE)
// These map biblical books to their approximate historical period
const BOOK_DATES: Record<string, [number, number]> = {
  'Genesis':       [-2000, -1500],
  'Exodus':        [-1500, -1400],
  'Leviticus':     [-1400, -1400],
  'Numbers':       [-1400, -1360],
  'Deuteronomy':   [-1400, -1360],
  'Joshua':        [-1400, -1350],
  'Judges':        [-1350, -1050],
  'Ruth':          [-1150, -1100],
  '1 Samuel':      [-1100, -1010],
  '2 Samuel':      [-1010, -970],
  '1 Kings':       [-970,  -850],
  '2 Kings':       [-850,  -586],
  '1 Chronicles':  [-1010, -970],
  '2 Chronicles':  [-970,  -586],
  'Ezra':          [-538,  -458],
  'Nehemiah':      [-445,  -432],
  'Esther':        [-486,  -465],
  'Job':           [-2000, -1800],
  'Psalms':        [-1000, -400],
  'Proverbs':      [-970,  -700],
  'Ecclesiastes':  [-940,  -930],
  'Song of Solomon': [-960, -950],
  'Isaiah':        [-740,  -680],
  'Jeremiah':      [-627,  -586],
  'Lamentations':  [-586,  -585],
  'Ezekiel':       [-593,  -571],
  'Daniel':        [-605,  -536],
  'Hosea':         [-750,  -715],
  'Joel':          [-835,  -800],
  'Amos':          [-760,  -750],
  'Obadiah':       [-586,  -585],
  'Jonah':         [-780,  -760],
  'Micah':         [-735,  -700],
  'Nahum':         [-663,  -612],
  'Habakkuk':      [-610,  -605],
  'Zephaniah':     [-640,  -625],
  'Haggai':        [-520,  -520],
  'Zechariah':     [-520,  -480],
  'Malachi':       [-440,  -430],
  // NT books — Herodotus doesn't cover these, but include for completeness
  'Matthew':       [-5, 30],
  'Mark':          [25, 30],
  'Luke':          [-5, 30],
  'John':          [25, 30],
  'Acts':          [30, 62],
}

export async function GET(req: NextRequest) {
  const book = req.nextUrl.searchParams.get('book')
  const chapterStr = req.nextUrl.searchParams.get('chapter')

  if (!book) {
    return NextResponse.json({ error: 'book parameter required' }, { status: 400 })
  }

  const dates = BOOK_DATES[book]
  if (!dates) {
    return NextResponse.json({
      book,
      message: 'No historical date mapping available for this book.',
      results: [],
      kingdoms: [],
    })
  }

  const [startDate, endDate] = dates
  const supabase = db()

  // Query herodotus_histories for overlapping date ranges
  // Herodotus covers roughly -700 to -400 BCE
  const { data, error } = await supabase
    .from('herodotus_histories')
    .select('book_number, book_name, chapter, content, proper_nouns, scripture_connections, kingdoms, date_range_start, date_range_end, source_tier, authority_notice')
    .or(`and(date_range_start.lte.${endDate},date_range_end.gte.${startDate}),and(date_range_start.is.null,date_range_end.is.null)`)
    .not('date_range_start', 'is', null)
    .order('date_range_start', { ascending: true })
    .limit(25)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Extract unique kingdoms from results
  const kingdomSet = new Set<string>()
  for (const row of data ?? []) {
    if (row.kingdoms) {
      for (const k of row.kingdoms) kingdomSet.add(k)
    }
  }

  // Group results by kingdom for kingdom-by-kingdom display
  const byKingdom: Record<string, typeof data> = {}
  for (const row of data ?? []) {
    if (row.kingdoms) {
      for (const k of row.kingdoms) {
        if (!byKingdom[k]) byKingdom[k] = []
        byKingdom[k].push(row)
      }
    }
  }

  return NextResponse.json({
    book,
    chapter: chapterStr ? parseInt(chapterStr) : null,
    date_range: { start: startDate, end: endDate },
    results: data ?? [],
    kingdoms: Array.from(kingdomSet).sort(),
    by_kingdom: byKingdom,
    authority_notice: 'These sources are secular historical records. They carry no theological authority. The Bible interprets history. History does not interpret the Bible.',
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600' },
  })
}
