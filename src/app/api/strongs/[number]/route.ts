import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params
  const englishWord = req.nextUrl.searchParams.get('word') ?? ''
  const supabase = db()

  const { data, error } = await supabase
    .from('strongs_entries')
    .select('strongs_number, original_word, transliteration, pronunciation, definition, part_of_speech, kjv_usage, testament, strongs_def, outline_of_biblical_usage, derivation, root_words')
    .eq('strongs_number', number)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Also fetch Webster's entry if word provided
  let webster = null
  if (englishWord) {
    const { data: w } = await supabase
      .from('websters_1828')
      .select('word, definition, part_of_speech, etymology')
      .eq('word', englishWord.toLowerCase().replace(/[^a-z'-]/g, ''))
      .maybeSingle()
    webster = w
  }

  return NextResponse.json({ ...data, webster }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } })
}
