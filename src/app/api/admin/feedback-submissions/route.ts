import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_ID = '2f4cc459-6fdd-4f41-be4b-754770b28529'
function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_ID) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: submissions } = await db()
    .from('feedback_submissions')
    .select('*, ai_triage(*)')
    .order('created_at', { ascending: false })
    .limit(200)

  return NextResponse.json(submissions ?? [])
}
