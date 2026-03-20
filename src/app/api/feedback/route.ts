import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll() }, setAll() {} },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 })

  const { type, subject, message, page_context } = await req.json()
  if (!type || !subject || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = db()
  const { data: profile } = await supabase.from('users').select('email, display_name').eq('id', user.id).single()
  const userEmail = profile?.email ?? user.email ?? ''
  const userName = profile?.display_name ?? userEmail.split('@')[0]

  const { data: feedback, error } = await supabase.from('feedback').insert({
    user_id: user.id,
    user_email: userEmail,
    user_name: userName,
    type, subject, message, page_context,
    status: 'new',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send emails via Resend
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Auto-reply to user
    await resend.emails.send({
      from: 'Logos by Kai\'Ros <logos@summitbiblecenter.com>',
      to: userEmail,
      subject: 'We received your message — Logos by Kai\'Ros',
      html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2C1810">
        <p>Thank you for taking the time to write to us.</p>
        <p>We have received your message and Pastor Tave will personally review it. Your feedback helps make Logos better for every believer who uses it.</p>
        <p style="margin-top:1.5rem;padding:1rem;background:#F8F2E2;border-radius:4px">
          <strong>Your message:</strong> ${subject}<br/>
          <strong>Type:</strong> ${type}
        </p>
        <p style="margin-top:2rem;color:#8B6914;font-style:italic">"He must increase, but I must decrease." — John 3:30</p>
        <p style="margin-top:1rem;font-size:13px;color:#888">The Logos Team<br/>logos.summitbiblecenter.com</p>
      </div>`,
    })

    // Admin notification
    await resend.emails.send({
      from: 'Logos Feedback <logos@summitbiblecenter.com>',
      to: 'pastortave@summitbiblecenter.com',
      subject: `New ${type} feedback — Logos`,
      html: `<div style="font-family:sans-serif;max-width:520px;color:#1A1A1A">
        <p><strong>From:</strong> ${userName} (${userEmail})</p>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p style="padding:1rem;background:#f5f5f5;border-radius:4px;white-space:pre-wrap">${message}</p>
        ${page_context ? `<p style="font-size:12px;color:#888">Page: ${page_context}</p>` : ''}
        <p style="font-size:12px;color:#888">Submitted: ${new Date().toLocaleString()}</p>
        <p style="margin-top:1rem"><a href="https://logos.summitbiblecenter.com/admin">Review in Admin</a></p>
      </div>`,
    })
  } catch (e) {
    console.error('Email error:', e)
  }

  return NextResponse.json({ success: true, id: feedback?.id })
}
