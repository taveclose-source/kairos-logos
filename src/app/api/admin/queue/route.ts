import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore
          }
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function checkAdmin(): Promise<{ authorized: boolean }> {
  const user = await getAuthUser()
  if (!user?.email) return { authorized: false }
  return { authorized: ADMIN_EMAILS.includes(user.email.toLowerCase()) }
}

// GET — list all queue items
export async function GET() {
  const { authorized } = await checkAdmin()
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized — admin access required' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
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
  const { authorized } = await checkAdmin()
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized — admin access required' }, { status: 401 })
  }

  const { id, action, approved_answer } = await req.json()

  if (!id || !action) {
    return NextResponse.json({ error: 'id and action required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

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
