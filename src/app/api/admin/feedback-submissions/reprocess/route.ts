import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { processSubmission } from '@/lib/feedback-processor'

const ADMIN_ID = '2f4cc459-6fdd-4f41-be4b-754770b28529'
function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_ID) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Find submissions without engineering reports
  const { data: pending } = await db().from('feedback_submissions')
    .select('id, category, message, page, user_name, user_email')
    .is('engineering_report', null)
    .order('created_at', { ascending: true })

  if (!pending || pending.length === 0) {
    return NextResponse.json({ message: 'No submissions to reprocess', count: 0 })
  }

  // Process each (fire-and-forget for speed)
  for (const s of pending) {
    processSubmission(s.id, s.category, s.message, s.page, s.user_name || '', s.user_email || '').catch(e => {
      console.error(`Reprocess failed for ${s.id}:`, e)
    })
  }

  return NextResponse.json({ message: `Reprocessing ${pending.length} submissions`, count: pending.length })
}
