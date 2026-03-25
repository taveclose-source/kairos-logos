import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const decoded = decodeURIComponent(name).trim()
  const normalized = decoded.toLowerCase().replace(/[^a-z ]/g, '')
  const supabase = db()

  // 1. Hitchcock's Bible Names — primary meaning
  const { data: hitchcock } = await supabase
    .from('hitchcock_names')
    .select('name, meaning, language_origin, gender, scripture_refs, strongs_number, notes')
    .ilike('name_normalized', normalized)
    .limit(1)
    .maybeSingle()

  // 2. Smith's Bible Dictionary — cultural context
  const { data: smiths } = await supabase
    .from('smiths_dictionary')
    .select('topic, definition, scripture_refs, strongs_numbers, see_also, entry_type')
    .ilike('topic_normalized', normalized)
    .limit(1)
    .maybeSingle()

  // 3. Gesenius Hebrew-Chaldee Lexicon — Hebrew root etymology
  // Try by Strong's number from Hitchcock first, then by name match
  let gesenius = null
  if (hitchcock?.strongs_number) {
    const { data: g } = await supabase
      .from('gesenius_lexicon')
      .select('strongs_number, hebrew_word, transliteration, definition, extended_definition, root, cognates, scripture_refs')
      .eq('strongs_number', hitchcock.strongs_number)
      .maybeSingle()
    gesenius = g
  }

  // 4. Cross-reference Strong's entry if available
  let strongs = null
  const strongsNum = hitchcock?.strongs_number || (smiths?.strongs_numbers?.[0] ?? null)
  if (strongsNum) {
    const { data: s } = await supabase
      .from('strongs_entries')
      .select('strongs_number, original_word, transliteration, pronunciation, definition, part_of_speech, kjv_usage')
      .eq('strongs_number', strongsNum)
      .maybeSingle()
    strongs = s
  }

  // 5. Nave's Topical Bible
  const { data: naves } = await supabase
    .from('naves_topical')
    .select('topic, subtopic, content, scripture_refs, see_also, strongs_numbers')
    .ilike('topic_normalized', normalized)
    .limit(5)

  if (!hitchcock && !smiths && !gesenius && (!naves || naves.length === 0)) {
    return NextResponse.json({ error: 'Name not found' }, { status: 404 })
  }

  return NextResponse.json(
    { name: decoded, hitchcock, smiths, gesenius, strongs, naves: naves ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=86400' } }
  )
}
