import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

const ADMIN_EMAIL = 'pastortave@summitbiblecenter.com'

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

  // Get user profile
  const { data: profile } = await supabase.from('users').select('email, display_name').eq('id', user.id).single()
  const userEmail = profile?.email ?? user.email ?? ''
  const userName = profile?.display_name ?? userEmail.split('@')[0]

  // 1. Save to feedback_submissions
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

  const feedbackId = submission.id

  // 2. AI triage with Haiku (fire-and-forget — don't block the user)
  triageAndNotify(feedbackId, category, message, page, userName, userEmail).catch((e) => {
    console.error('Triage/notify error:', e)
  })

  return NextResponse.json({ success: true, id: feedbackId })
}

async function triageAndNotify(
  feedbackId: string,
  category: string,
  message: string,
  page: string | null,
  userName: string,
  userEmail: string,
) {
  const supabase = db()

  // AI triage
  let summary = ''
  let suggestedAction = ''
  let priority = 'medium'

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You triage user feedback for Logos by Kai'Ros, a KJV Bible platform. Respond in JSON only: {"summary":"1-2 sentence summary","suggested_action":"what the team should do","priority":"low|medium|high|critical"}. Be concise. Priority guide: critical=app broken/data loss, high=significant usability issue, medium=improvement/content request, low=praise/minor cosmetic.`,
      messages: [{ role: 'user', content: `Category: ${category}\nPage: ${page || 'unknown'}\nMessage: ${message}` }],
    })

    const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
    const parsed = JSON.parse(text)
    summary = parsed.summary || message.slice(0, 120)
    suggestedAction = parsed.suggested_action || ''
    priority = parsed.priority || 'medium'
  } catch (e) {
    console.error('AI triage failed:', e)
    summary = message.slice(0, 120)
    suggestedAction = 'Manual review needed — AI triage failed'
    priority = 'medium'
  }

  // Save triage
  await supabase.from('ai_triage').insert({
    feedback_id: feedbackId,
    summary,
    suggested_action: suggestedAction,
    priority,
  })

  // 3. Send Resend notification to admin
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const priorityColor = { critical: '#DC2626', high: '#EA580C', medium: '#CA8A04', low: '#16A34A' }[priority] || '#CA8A04'

    await resend.emails.send({
      from: 'Logos Feedback <logos@summitbiblecenter.com>',
      to: ADMIN_EMAIL,
      subject: `[${priority.toUpperCase()}] ${category} feedback — Logos`,
      html: `<div style="font-family:sans-serif;max-width:520px;color:#1A1A1A">
        <p style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;color:#fff;background:${priorityColor};text-transform:uppercase;letter-spacing:1px">${priority}</p>
        <p style="margin-top:12px"><strong>From:</strong> ${userName} (${userEmail})</p>
        <p><strong>Category:</strong> ${category}</p>
        ${page ? `<p style="font-size:12px;color:#888">Page: ${page}</p>` : ''}
        <p style="margin-top:12px"><strong>AI Summary:</strong></p>
        <p style="padding:12px;background:#f5f5f5;border-radius:4px;border-left:3px solid ${priorityColor}">${summary}</p>
        <p><strong>Suggested Action:</strong> ${suggestedAction}</p>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
        <p><strong>Full Message:</strong></p>
        <p style="padding:12px;background:#f9f9f9;border-radius:4px;white-space:pre-wrap">${message}</p>
        <p style="margin-top:16px"><a href="https://logos.summitbiblecenter.com/admin" style="color:#0F3460">Review in Admin Panel</a></p>
      </div>`,
    })

    // Record notification
    await supabase.from('feedback_notifications').insert({
      feedback_id: feedbackId,
      admin_notified_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('Email notification failed:', e)
  }
}
