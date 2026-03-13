import { NextResponse } from 'next/server'
import { createBrowserClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('twi_glossary')
    .select('id, kjv_term, twi_term, locked, notes, category, strongs_number, book_introduced')
    .order('category')
    .order('kjv_term')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [], {
    headers: {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
