#!/usr/bin/env node
/**
 * Reprocess feedback submissions that lack engineering reports.
 * Run: node scripts/reprocess-feedback.js
 * Requires: .env.local with SUPABASE_URL, SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk').default
const { Resend } = require('resend')
const fs = require('fs')
const path = require('path')

const ADMIN_EMAIL = 'pastortave@summitbiblecenter.com'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function stripFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

async function processOne(s) {
  console.log(`\n--- Processing: ${s.id} (${s.category}) ---`)
  console.log(`Message: ${s.message.slice(0, 80)}...`)

  // Step 1: Haiku triage
  let summary = '', suggestedAction = '', priority = 'medium'
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You triage user feedback for Logos by Kai'Ros, a KJV Bible platform. Respond in JSON only: {"summary":"1-2 sentence summary","suggested_action":"what the team should do","priority":"low|medium|high|critical"}.`,
      messages: [{ role: 'user', content: `Category: ${s.category}\nPage: ${s.page || 'unknown'}\nMessage: ${s.message}` }],
    })
    const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
    const parsed = JSON.parse(stripFences(text))
    summary = parsed.summary || s.message.slice(0, 120)
    suggestedAction = parsed.suggested_action || ''
    priority = parsed.priority || 'medium'
    console.log(`Triage: ${priority} — ${summary}`)
  } catch (e) {
    console.error('Triage failed:', e.message)
    summary = s.message.slice(0, 120)
  }

  await db.from('ai_triage').insert({ feedback_id: s.id, summary, suggested_action: suggestedAction, priority })

  // Step 2: Sonnet engineering report
  let report = null
  try {
    let codebaseIndex = {}
    try {
      codebaseIndex = JSON.parse(fs.readFileSync(path.join(__dirname, 'codebase-index.json'), 'utf8'))
    } catch { console.warn('Could not load codebase-index.json') }

    const indexSummary = Object.entries(codebaseIndex).map(([f, d]) => `${f}: ${d}`).join('\n')

    // Identify relevant files
    const filePickRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are a senior engineer analyzing a Next.js Bible platform codebase. Given user feedback and a file index, identify the 3-5 most relevant source files. Respond with ONLY a JSON array of file paths.`,
      messages: [{ role: 'user', content: `Feedback: ${s.category} — ${s.message}\n\nCodebase index:\n${indexSummary}` }],
    })
    const filePickText = filePickRes.content[0]?.type === 'text' ? filePickRes.content[0].text : '[]'
    const relevantFiles = JSON.parse(stripFences(filePickText))
    console.log(`Relevant files: ${relevantFiles.join(', ')}`)

    // Fetch files from GitHub if PAT available
    let fileContext = ''
    const pat = process.env.GITHUB_PAT
    if (pat && pat !== 'ghp_placeholder') {
      for (const fp of relevantFiles) {
        try {
          const url = `https://raw.githubusercontent.com/taveclose-source/kairos-logos/master/src/${fp}`
          const res = await fetch(url, { headers: { Authorization: `token ${pat}` } })
          if (res.ok) {
            const content = await res.text()
            fileContext += `=== ${fp} ===\n${content.slice(0, 3000)}\n\n`
          }
        } catch {}
      }
      console.log(`Fetched ${fileContext ? 'file contents' : 'no files (PAT may be invalid)'}`)
    } else {
      console.log('GITHUB_PAT not configured — using index only')
      fileContext = indexSummary.slice(0, 2000)
    }

    // Generate report
    const reportRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are Bubby, the engineering agent for Logos by Kai'Ros (KJV Bible platform, Next.js/Supabase/Tailwind). Generate a structured engineering report. Respond in JSON only:
{"plain_english_summary":"2-3 sentences","affected_files":[{"path":"file","reason":"why"}],"complexity":"Simple|Medium|Complex","complexity_note":"definition","build_cost_estimate":"$X","ongoing_cost_per_user":"$X/month or None","recommendation":"Build Now|Queue|Decline","recommendation_reason":"one sentence","bubby_prompt":"complete Bubby prompt under 3000 chars"}`,
      messages: [{ role: 'user', content: `Category: ${s.category}\nMessage: ${s.message}\nTriage: ${summary}\nPriority: ${priority}\n\nSource files:\n${fileContext}` }],
    })
    const reportText = reportRes.content[0]?.type === 'text' ? reportRes.content[0].text : ''
    report = JSON.parse(stripFences(reportText))
    console.log(`Report: ${report.complexity} — ${report.recommendation}`)

    await db.from('feedback_submissions').update({ engineering_report: report }).eq('id', s.id)
    console.log('Report saved to DB')
  } catch (e) {
    console.error('Engineering report failed:', e.message)
  }

  // Step 3: Send email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const complexity = report?.complexity || 'Medium'
    const complexityColor = { Simple: '#16A34A', Medium: '#CA8A04', Complex: '#DC2626' }[complexity] || '#CA8A04'
    const recColor = { 'Build Now': '#16A34A', Queue: '#CA8A04', Decline: '#DC2626' }[report?.recommendation] || '#888'
    const plainSummary = report?.plain_english_summary || summary
    const subjectLine = `[${complexity}] Make Us Better — ${s.category}: ${plainSummary.slice(0, 60)}`
    const affectedFiles = report?.affected_files || []
    const bubbyPrompt = report?.bubby_prompt || ''

    await resend.emails.send({
      from: 'Logos Engineering <logos@summitbiblecenter.com>',
      to: ADMIN_EMAIL,
      subject: subjectLine,
      html: `<div style="font-family:sans-serif;max-width:600px;color:#1A1A1A">
        <p style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;color:#fff;background:${complexityColor};text-transform:uppercase">${complexity}</p>
        <span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;color:#fff;background:${recColor};text-transform:uppercase;margin-left:6px">${report?.recommendation || 'Pending'}</span>
        <p style="margin-top:16px"><strong>From:</strong> ${s.user_name} (${s.user_email})</p>
        <p><strong>Category:</strong> ${s.category}</p>
        <h3 style="margin-top:16px;font-size:14px">User Message</h3>
        <p style="padding:12px;background:#f9f9f9;border-radius:4px;white-space:pre-wrap;font-size:13px">${s.message}</p>
        <h3 style="margin-top:16px;font-size:14px">Engineering Summary</h3>
        <p style="padding:12px;background:#f0f7ff;border-radius:4px;border-left:3px solid #2563EB;font-size:13px">${plainSummary}</p>
        <h3 style="margin-top:16px;font-size:14px">Affected Files</h3>
        <ul style="font-size:12px">${affectedFiles.map(f => `<li><code>${f.path}</code> — ${f.reason}</li>`).join('')}</ul>
        <p style="font-size:13px"><strong>Build:</strong> ${report?.build_cost_estimate || 'TBD'} · <strong>Ongoing:</strong> ${report?.ongoing_cost_per_user || 'None'}</p>
        <h3 style="margin-top:16px;font-size:14px">Bubby Prompt</h3>
        <pre style="padding:12px;background:#1a1a2e;color:#e0e0e0;border-radius:4px;font-size:11px;white-space:pre-wrap;font-family:monospace">${bubbyPrompt.replace(/</g, '&lt;')}</pre>
        <p style="margin-top:20px"><a href="https://logos.summitbiblecenter.com/admin" style="padding:8px 20px;background:#0F3460;color:#fff;border-radius:4px;text-decoration:none">Review in Admin</a></p>
      </div>`,
    })
    console.log(`Email sent: ${subjectLine}`)
  } catch (e) {
    console.error('Email failed:', e.message)
  }
}

async function main() {
  console.log('=== Reprocessing feedback submissions ===')
  console.log(`SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING'}`)
  console.log(`ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING'}`)
  console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'set' : 'MISSING'}`)
  console.log(`GITHUB_PAT: ${process.env.GITHUB_PAT && process.env.GITHUB_PAT !== 'ghp_placeholder' ? 'set' : 'placeholder/missing'}`)

  const { data: pending } = await db.from('feedback_submissions')
    .select('id, category, message, page, user_name, user_email')
    .is('engineering_report', null)
    .order('created_at', { ascending: true })

  console.log(`Found ${pending?.length || 0} submissions to process`)

  if (!pending || pending.length === 0) return

  for (const s of pending) {
    await processOne(s)
  }

  console.log('\n=== Done ===')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
