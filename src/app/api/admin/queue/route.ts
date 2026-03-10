import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function checkAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return false
  const password = authHeader.replace('Bearer ', '')
  return password === process.env.ADMIN_PASSWORD
}

// GET — list all queue items
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('theological_queue')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data })
}

// PATCH — approve or dismiss a queue item
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, action, approved_answer } = await req.json()

  if (!id || !action) {
    return NextResponse.json({ error: 'id and action required' }, { status: 400 })
  }

  const supabase = getSupabase()

  if (action === 'approve') {
    if (!approved_answer || typeof approved_answer !== 'string') {
      return NextResponse.json({ error: 'approved_answer required for approve action' }, { status: 400 })
    }

    const { error } = await supabase
      .from('theological_queue')
      .update({
        status: 'approved',
        approved_answer: approved_answer.trim(),
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: 'approved' })
  }

  if (action === 'dismiss') {
    const { error } = await supabase
      .from('theological_queue')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: 'rejected' })
  }

  return NextResponse.json({ error: 'Invalid action. Use "approve" or "dismiss".' }, { status: 400 })
}
