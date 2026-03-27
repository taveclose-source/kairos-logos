import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { processSubmission } from '@/lib/feedback-processor'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const { category, message, page } = await req.json()
  if (!category || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = db()
  const { data: profile } = await supabase.from('users').select('email, display_name').eq('id', user.id).single()
  const userEmail = profile?.email ?? user.email ?? ''
  const userName = profile?.display_name ?? userEmail.split('@')[0]

  const { data: submission, error: insertErr } = await supabase.from('feedback_submissions').insert({
    user_id: user.id,
    user_email: userEmail,
    user_name: userName,
    page: page || null,
    category,
    message,
    status: 'new',
  }).select('id').single()

  if (insertErr || !submission) {
    return NextResponse.json({ error: insertErr?.message || 'Failed to save' }, { status: 500 })
  }

  // Fire-and-forget: triage + engineering report + email
  processSubmission(submission.id, category, message, page, userName, userEmail).catch((e) => {
    console.error('Feedback processing error:', e)
  })

  return NextResponse.json({ success: true, id: submission.id })
}
