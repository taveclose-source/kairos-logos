import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { id, email, display_name, first_name, last_name, username } = await req.json()
    if (!id || !email) {
      return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check username uniqueness if provided
    if (username) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', id)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ error: 'username_taken' }, { status: 409 })
      }
    }

    const fName = first_name || (display_name ? display_name.split(' ')[0] : email.split('@')[0])
    const lName = last_name || ''

    await supabase.from('users').upsert(
      {
        id,
        email,
        first_name: fName,
        last_name: lName,
        display_name: display_name || `${fName} ${lName}`.trim() || email.split('@')[0],
        username: username ? username.toLowerCase() : null,
        subscription_tier: 'free',
        subscription_status: 'active',
      },
      { onConflict: 'id' }
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
