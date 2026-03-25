import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { words } = await req.json()
  if (!words || !Array.isArray(words) || words.length === 0) {
    return NextResponse.json({})
  }

  const supabase = db()

  // Deduplicate and normalize
  const normalized = (words as string[])
    .map(w => w.replace(/[^a-zA-ZɔɛɲŋàáèéìíòóùúâêîôûãẽĩõũƆƐ'-]/g, '').toLowerCase())
    .filter(w => w.length >= 2)
  const unique = Array.from(new Set(normalized))

  if (unique.length === 0) return NextResponse.json({})

  // Query translation_word_index, Christaller lexicon, and English-Twi in parallel
  const [indexRes, christallerRes, engTwiRes] = await Promise.all([
    supabase
      .from('translation_word_index')
      .select('twi_normalized, strongs_number')
      .in('twi_normalized', unique),

    supabase
      .from('twi_lexicon')
      .select('twi_normalized')
      .in('twi_normalized', unique),

    // Fetch all English-Twi entries and filter server-side
    supabase
      .from('english_twi_lexicon')
      .select('twi_equivalents')
      .limit(10000),
  ])

  // Build classification sets
  const strongsWords = new Set<string>()
  const indexWords = new Set<string>() // in word index but no Strong's
  const christallerWords = new Set<string>()

  for (const row of indexRes.data || []) {
    if (row.strongs_number) strongsWords.add(row.twi_normalized)
    else indexWords.add(row.twi_normalized)
  }

  for (const row of christallerRes.data || []) {
    christallerWords.add(row.twi_normalized)
  }

  // Build set of all Twi words found in English-Twi lexicon
  const engTwiAll = new Set<string>()
  for (const row of engTwiRes.data || []) {
    for (const eq of row.twi_equivalents || []) {
      engTwiAll.add(eq.toLowerCase())
    }
  }

  // Classify each word: 'strongs' | 'dictionary' | omitted
  const result: Record<string, string> = {}
  for (const w of unique) {
    if (strongsWords.has(w)) {
      result[w] = 'strongs'
    } else if (christallerWords.has(w) || indexWords.has(w) || engTwiAll.has(w)) {
      result[w] = 'dictionary'
    }
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
  })
}
