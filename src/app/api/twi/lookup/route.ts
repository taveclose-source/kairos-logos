import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { word, strongs_number, glossary_term } = await req.json()
  if (!word) return NextResponse.json({ error: 'word required' }, { status: 400 })

  const cleaned = word.replace(/[^a-zA-ZɔɛɲŋàáèéìíòóùúâêîôûãẽĩõũƆƐ'-]/g, '').trim()
  const lower = cleaned.toLowerCase()
  const supabase = db()

  // Query all sources in parallel — every word gets ALL five lookups
  const [indexRes, christallerRes, engTwiRes, glossaryRes] = await Promise.all([
    // 1. Translation word index
    supabase
      .from('translation_word_index')
      .select('*')
      .or(`twi_word.ilike.${lower},twi_normalized.ilike.${lower}`)
      .limit(1)
      .maybeSingle(),

    // 2. Christaller lexicon
    supabase
      .from('twi_lexicon')
      .select('*')
      .or(`twi_headword.ilike.${lower},twi_normalized.ilike.${lower}`)
      .limit(1)
      .maybeSingle(),

    // 3. English-Twi reverse lookup — find entries where twi_equivalents contains this word
    supabase
      .from('english_twi_lexicon')
      .select('*')
      .contains('twi_equivalents', [lower])
      .limit(3),

    // 4. Glossary check — if the caller provides the parent glossary_term (for words
    //    within multi-word glossary phrases like "ɔsoro ahennie"), search by the full
    //    phrase so the glossary badge still appears when tapping an individual word.
    //    Otherwise try exact match, then fall back to partial match.
    glossary_term
      ? supabase
          .from('twi_glossary')
          .select('kjv_term, twi_term, locked, notes, strongs_number, category')
          .ilike('twi_term', glossary_term.toLowerCase())
          .limit(1)
          .maybeSingle()
      : supabase
          .from('twi_glossary')
          .select('kjv_term, twi_term, locked, notes, strongs_number, category')
          .ilike('twi_term', lower)
          .limit(1)
          .maybeSingle(),
  ])

  const idx = indexRes.data
  const effectiveStrongs = strongs_number || idx?.strongs_number || glossaryRes.data?.strongs_number || null

  // 5. Strong's entry if available
  let strongsEntry = null
  if (effectiveStrongs) {
    const { data } = await supabase
      .from('strongs_entries')
      .select('strongs_number, original_word, transliteration, definition, part_of_speech')
      .eq('strongs_number', effectiveStrongs)
      .maybeSingle()
    strongsEntry = data
  }

  // 6. Scripture usage — sample verses
  let sampleVerses: { book: string; chapter: number; verse: number; twi_text: string; kjv_text: string }[] = []
  if (idx?.verse_ids && idx.verse_ids.length > 0) {
    const sampleIds = idx.verse_ids.slice(0, 5)
    const { data: verses } = await supabase
      .from('bible_verses')
      .select('id, book_id, chapter, verse, kjv_text, twi_text')
      .in('id', sampleIds)

    if (verses && verses.length > 0) {
      const bookIds = Array.from(new Set(verses.map(v => v.book_id)))
      const { data: booksData } = await supabase
        .from('bible_books')
        .select('id, book_name')
        .in('id', bookIds)
      const bookNames: Record<string, string> = {}
      for (const b of booksData || []) bookNames[b.id] = b.book_name

      sampleVerses = verses.map(v => ({
        book: bookNames[v.book_id] || 'Unknown',
        chapter: v.chapter,
        verse: v.verse,
        twi_text: v.twi_text || '',
        kjv_text: (v.kjv_text || '').replace(/\s*\{[^}]*\}\s*/g, ' ').trim(),
      }))
    }
  }

  return NextResponse.json({
    word: cleaned,
    christaller: christallerRes.data || null,
    english_twi: (engTwiRes.data && engTwiRes.data.length > 0) ? engTwiRes.data : null,
    scripture_usage: idx ? {
      occurrence_count: idx.occurrence_count,
      book_breakdown: idx.book_occurrences,
      sample_verses: sampleVerses,
    } : null,
    glossary: glossaryRes.data ? {
      is_locked: glossaryRes.data.locked || false,
      approved_rendering: glossaryRes.data.twi_term,
      locked_by: glossaryRes.data.locked ? 'Tave Sr.' : null,
      kjv_term: glossaryRes.data.kjv_term,
      notes: glossaryRes.data.notes,
      category: glossaryRes.data.category,
    } : null,
    strongs_link: strongsEntry ? {
      number: strongsEntry.strongs_number,
      original_word: strongsEntry.original_word,
      transliteration: strongsEntry.transliteration,
      definition: strongsEntry.definition,
      part_of_speech: strongsEntry.part_of_speech,
    } : null,
    kjv_english_word: idx?.kjv_english_word || null,
    strongs_number: effectiveStrongs,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400' },
  })
}
