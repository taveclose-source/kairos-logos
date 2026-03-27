import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { fetchMultipleFiles } from '@/lib/github-fetch'
import * as fs from 'fs'
import * as path from 'path'

const ADMIN_EMAIL = 'pastortave@summitbiblecenter.com'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function processSubmission(
  feedbackId: string,
  category: string,
  message: string,
  page: string | null,
  userName: string,
  userEmail: string,
) {
  const supabase = db()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  // ── Step 1: Haiku triage ──
  let summary = '', suggestedAction = '', priority = 'medium'
  try {
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
    suggestedAction = 'Manual review needed'
    priority = 'medium'
  }

  await supabase.from('ai_triage').insert({ feedback_id: feedbackId, summary, suggested_action: suggestedAction, priority })

  // ── Step 2: Engineering report (Sonnet) ──
  let report: Record<string, unknown> | null = null
  try {
    let codebaseIndex: Record<string, string> = {}
    try {
      const indexPath = path.join(process.cwd(), 'scripts', 'codebase-index.json')
      codebaseIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
    } catch { console.warn('Could not load codebase-index.json') }

    const indexSummary = Object.entries(codebaseIndex).map(([f, d]) => `${f}: ${d}`).join('\n')

    // Identify relevant files
    const filePickRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are a senior engineer analyzing a Next.js Bible platform codebase. Given user feedback and a file index, identify the 3-5 most relevant source files. Respond with ONLY a JSON array of file paths, e.g. ["app/study/page.tsx","lib/permissions.ts"]`,
      messages: [{ role: 'user', content: `Feedback category: ${category}\nPage: ${page || 'unknown'}\nMessage: ${message}\n\nCodebase index:\n${indexSummary}` }],
    })
    const filePickText = filePickRes.content[0]?.type === 'text' ? filePickRes.content[0].text : '[]'
    const relevantFiles: string[] = JSON.parse(filePickText)

    const fileContents = await fetchMultipleFiles(relevantFiles)
    const fileContext = Object.entries(fileContents)
      .map(([fp, content]) => `=== ${fp} ===\n${content.slice(0, 3000)}`)
      .join('\n\n')

    // Generate full report
    const reportRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are Bubby, the engineering agent for Logos by Kai'Ros (KJV Bible platform, Next.js/Supabase/Tailwind). Generate a structured engineering report for user feedback. Respond in JSON only with these exact fields:
{
  "plain_english_summary": "2-3 sentence non-technical explanation",
  "affected_files": [{"path": "file/path.tsx", "reason": "one line why"}],
  "complexity": "Simple|Medium|Complex",
  "complexity_note": "Simple=1 file under 1 hour, Medium=3-5 files half day, Complex=architectural multi-session",
  "build_cost_estimate": "$0.XX one-time Bubby session",
  "ongoing_cost_per_user": "$0.XX/month or None",
  "recommendation": "Build Now|Queue|Decline",
  "recommendation_reason": "one sentence",
  "bubby_prompt": "Complete ready-to-paste Bubby prompt under 3000 chars, imperative style, specific file paths and changes"
}`,
      messages: [{ role: 'user', content: `Category: ${category}\nPage: ${page || 'unknown'}\nUser message: ${message}\n\nTriage summary: ${summary}\nPriority: ${priority}\n\nRelevant source files:\n${fileContext || 'No files fetched — GITHUB_PAT may not be configured. Base report on codebase index.\n' + indexSummary.slice(0, 2000)}` }],
    })
    const reportText = reportRes.content[0]?.type === 'text' ? reportRes.content[0].text : ''
    report = JSON.parse(reportText)

    await supabase.from('feedback_submissions').update({ engineering_report: report }).eq('id', feedbackId)
  } catch (e) {
    console.error('Engineering report failed:', e)
  }

  // ── Step 3: Send upgraded email ──
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const complexity = (report as Record<string, string>)?.complexity || 'Medium'
    const complexityColor = { Simple: '#16A34A', Medium: '#CA8A04', Complex: '#DC2626' }[complexity] || '#CA8A04'
    const recColor = { 'Build Now': '#16A34A', Queue: '#CA8A04', Decline: '#DC2626' }[(report as Record<string, string>)?.recommendation || ''] || '#888'
    const plainSummary = (report as Record<string, string>)?.plain_english_summary || summary
    const subjectSummary = plainSummary.slice(0, 60) + (plainSummary.length > 60 ? '...' : '')
    const affectedFiles = ((report as Record<string, unknown>)?.affected_files as Array<{ path: string; reason: string }>) || []
    const bubbyPrompt = (report as Record<string, string>)?.bubby_prompt || ''

    await resend.emails.send({
      from: 'Logos Engineering <logos@summitbiblecenter.com>',
      to: ADMIN_EMAIL,
      subject: `[${complexity}] Make Us Better — ${category}: ${subjectSummary}`,
      html: `<div style="font-family:sans-serif;max-width:600px;color:#1A1A1A">
        <p style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;color:#fff;background:${complexityColor};text-transform:uppercase;letter-spacing:1px">${complexity}</p>
        <span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;color:#fff;background:${recColor};text-transform:uppercase;letter-spacing:1px;margin-left:6px">${(report as Record<string, string>)?.recommendation || 'Pending'}</span>
        <p style="margin-top:16px"><strong>From:</strong> ${userName} (${userEmail})</p>
        <p><strong>Category:</strong> ${category}${page ? ` &middot; Page: ${page}` : ''}</p>
        <h3 style="margin-top:16px;font-size:14px;color:#333">User Message</h3>
        <p style="padding:12px;background:#f9f9f9;border-radius:4px;white-space:pre-wrap;font-size:13px">${message}</p>
        <h3 style="margin-top:16px;font-size:14px;color:#333">Engineering Summary</h3>
        <p style="padding:12px;background:#f0f7ff;border-radius:4px;border-left:3px solid #2563EB;font-size:13px">${plainSummary}</p>
        <h3 style="margin-top:16px;font-size:14px;color:#333">Affected Files</h3>
        <ul style="font-size:12px;line-height:1.8">${affectedFiles.map(f => `<li><code>${f.path}</code> — ${f.reason}</li>`).join('')}</ul>
        <p style="font-size:13px"><strong>Build Cost:</strong> ${(report as Record<string, string>)?.build_cost_estimate || 'TBD'} &middot; <strong>Ongoing:</strong> ${(report as Record<string, string>)?.ongoing_cost_per_user || 'None'}</p>
        <p style="font-size:13px"><strong>Recommendation:</strong> ${(report as Record<string, string>)?.recommendation_reason || ''}</p>
        <h3 style="margin-top:16px;font-size:14px;color:#333">Bubby Prompt</h3>
        <pre style="padding:12px;background:#1a1a2e;color:#e0e0e0;border-radius:4px;font-size:11px;white-space:pre-wrap;font-family:monospace;max-height:400px;overflow:auto">${bubbyPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        <p style="margin-top:20px"><a href="https://logos.summitbiblecenter.com/admin" style="display:inline-block;padding:8px 20px;background:#0F3460;color:#fff;border-radius:4px;text-decoration:none;font-size:13px">Review in Admin Panel</a></p>
      </div>`,
    })

    try {
      await supabase.from('feedback_notifications').insert({
        feedback_id: feedbackId,
        admin_notified_at: new Date().toISOString(),
      })
    } catch { /* ignore duplicate */ }
  } catch (e) {
    console.error('Email notification failed:', e)
  }
}
