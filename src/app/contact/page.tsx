'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useTheme } from '@/contexts/ThemeContext'

const TYPES = [
  { value: 'bug', emoji: '🐛', label: 'Report a Bug', desc: "Something isn't working right" },
  { value: 'feature', emoji: '💡', label: 'Request a Feature', desc: 'Something you wish Logos could do' },
  { value: 'general', emoji: '🙏', label: 'General Feedback', desc: 'Thoughts, questions, or suggestions' },
  { value: 'praise', emoji: '✨', label: 'Share a Praise', desc: 'Something that blessed you' },
]

const PLACEHOLDERS: Record<string, string> = {
  bug: "What is happening? e.g. Strong's panel not loading",
  feature: 'What would you like to see?',
  general: 'What is on your mind?',
  praise: 'What blessed you?',
}

export default function ContactPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { theme } = useTheme()
  const m = theme === 'modern'

  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/signin?redirect=/contact'); return }
      setLoggedIn(true)
      setLoading(false)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type || !subject || !message) { setError('Please fill in all fields'); return }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, subject, message, page_context: window.location.pathname }),
    })

    if (res.ok) setSubmitted(true)
    else setError('Something went wrong. Please try again.')
    setSubmitting(false)
  }

  if (loading || !loggedIn) return null

  const cardBg = m ? '#FFFFFF' : '#F8F2E2'
  const cardBorder = m ? '1px solid #ECEAE6' : '1px solid rgba(139,107,20,0.25)'
  const cardRadius = m ? 10 : 4
  const textMain = m ? '#1A1A1A' : '#1A0A04'
  const accent = m ? '#0F3460' : 'var(--gold)'
  const accentText = m ? '#FFFFFF' : '#1A0A04'

  if (submitted) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 style={{ fontFamily: m ? "'Inter', sans-serif" : 'var(--font-display)', fontSize: 24, color: textMain, marginBottom: 8 }}>Thank you</h1>
          <p style={{ fontFamily: m ? "'Inter', sans-serif" : 'var(--font-ui)', fontSize: 14, color: m ? '#555' : 'var(--text-secondary)', marginBottom: 24 }}>We received your message. Check your email for a confirmation.</p>
          <Link href="/">
            <span style={{ display: 'inline-block', padding: '10px 24px', background: accent, color: accentText, borderRadius: m ? 8 : 2, fontFamily: m ? "'Inter', sans-serif" : 'var(--font-ui)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Back to Logos</span>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontFamily: m ? "'Inter', sans-serif" : 'var(--font-display)', fontSize: m ? 28 : 24, fontWeight: m ? 700 : 400, color: textMain, marginBottom: 4 }}>Make Us Better</h1>
        <p style={{ fontFamily: m ? "'Inter', sans-serif" : 'var(--font-ui)', fontSize: 14, color: m ? '#555' : 'var(--text-secondary)', marginBottom: '2rem' }}>Your feedback shapes every future version of Logos.</p>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              style={{
                background: cardBg,
                border: type === t.value ? `2px solid ${m ? '#0F3460' : 'var(--gold)'}` : cardBorder,
                borderRadius: cardRadius,
                padding: '1rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 150ms',
              }}
            >
              <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>{t.emoji}</span>
              <span style={{ fontFamily: m ? "'Inter', sans-serif" : 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: textMain, display: 'block' }}>{t.label}</span>
              <span style={{ fontFamily: m ? "'Inter', sans-serif" : 'var(--font-ui)', fontSize: 11, color: m ? '#888' : 'var(--text-tertiary)' }}>{t.desc}</span>
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={type ? PLACEHOLDERS[type] : 'Select a type above first'}
              style={{ width: '100%', padding: '12px 16px', background: cardBg, border: cardBorder, borderRadius: cardRadius, fontFamily: m ? "'Inter', sans-serif" : 'var(--font-ui)', fontSize: 15, color: textMain, outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us more..."
              style={{ width: '100%', padding: '12px 16px', background: cardBg, border: cardBorder, borderRadius: cardRadius, fontFamily: m ? "'Inter', sans-serif" : 'var(--font-ui)', fontSize: 15, color: textMain, outline: 'none', resize: 'vertical' }}
            />
          </div>

          {error && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: '#c00', marginBottom: '0.75rem' }}>{error}</p>}

          <button
            type="submit"
            disabled={submitting || !type}
            style={{
              width: '100%', padding: '12px 24px',
              background: accent, color: accentText,
              borderRadius: m ? 8 : 2, border: 'none', cursor: 'pointer',
              fontFamily: m ? "'Inter', sans-serif" : 'var(--font-display)',
              fontSize: m ? 14 : 12, fontWeight: m ? 600 : 400,
              letterSpacing: m ? '0' : '2px',
              textTransform: m ? 'none' : 'uppercase',
              opacity: submitting || !type ? 0.5 : 1,
            }}
          >
            {submitting ? 'Sending...' : m ? 'Send Feedback' : 'SEND FEEDBACK'}
          </button>
        </form>
      </div>
    </main>
  )
}
