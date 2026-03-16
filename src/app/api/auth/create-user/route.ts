import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { id, email, display_name } = await req.json()
    if (!id || !email) {
      return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase.from('users').upsert(
      {
        id,
        email,
        display_name: display_name || email.split('@')[0],
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
