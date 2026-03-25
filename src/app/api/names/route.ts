import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Returns all Hitchcock name entries (lightweight — just name + meaning for client-side matching)
export async function GET() {
  const supabase = db()
  const { data, error } = await supabase
    .from('hitchcock_names')
    .select('name, name_normalized, meaning')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'public, s-maxage=86400' },
  })
}
