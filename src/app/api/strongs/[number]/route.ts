import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params
  const { data, error } = await db()
    .from('strongs_entries')
    .select('strongs_number, original_word, transliteration, definition, part_of_speech, kjv_usage, testament')
    .eq('strongs_number', number)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=86400' } })
}
