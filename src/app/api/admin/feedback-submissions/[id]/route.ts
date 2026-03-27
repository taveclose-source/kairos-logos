import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_ID = '2f4cc459-6fdd-4f41-be4b-754770b28529'
function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

async function verifyAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id === ADMIN_ID
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const { id } = await params
  const body = await req.json()

  const updates: Record<string, string> = {}
  if (body.status) updates.status = body.status
  if (typeof body.admin_notes === 'string') updates.admin_notes = body.admin_notes
  if (body.admin_action) updates.admin_action = body.admin_action

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await db().from('feedback_submissions').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If resolved, record in feedback_notifications
  if (body.status === 'resolved') {
    await db().from('feedback_notifications').update({ resolved_at: new Date().toISOString() }).eq('feedback_id', id)
  }

  return NextResponse.json({ ok: true })
}
