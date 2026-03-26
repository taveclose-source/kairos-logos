'use client'

import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { usePathname } from 'next/navigation'

const CATEGORIES = [
  { value: 'bug', label: 'Bug', icon: '🐛' },
  { value: 'suggestion', label: 'Suggestion', icon: '💡' },
  { value: 'content', label: 'Content', icon: '📖' },
  { value: 'praise', label: 'Praise', icon: '🙌' },
] as const

export default function FeedbackButton() {
  const { theme } = useTheme()
  const pathname = usePathname()
  const m = theme === 'modern'
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string>('suggestion')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isAdmin = pathname?.startsWith('/admin')

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus()
  }, [open])

  // Hide on admin pages
  if (isAdmin) return null

  function reset() {
    setCategory('suggestion')
    setMessage('')
    setError('')
    setDone(false)
  }

  async function handleSubmit() {
    if (!message.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim(), page: pathname }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Something went wrong.')
        return
      }
      setDone(true)
      setTimeout(() => { setOpen(false); reset() }, 2000)
    } catch {
      setError('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const accent = m ? '#0F3460' : '#C9A84C'
  const accentBg = m ? 'rgba(15,52,96,0.08)' : 'rgba(201,168,76,0.12)'
  const accentBorder = m ? 'rgba(15,52,96,0.2)' : 'rgba(201,168,76,0.3)'
  const modalBg = m ? '#FFFFFF' : '#F8F2E2'
  const textColor = m ? '#1A1A1A' : '#1A0A04'
  const subtleText = m ? '#888888' : '#8B5E10'

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); reset() }}
        aria-label="Make us better"
        style={{
          position: 'fixed',
          bottom: 72,
          right: 16,
          zIndex: 40,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: accent,
          color: '#FFFFFF',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 150ms, box-shadow 150ms',
          fontSize: 20,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.25)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.3)' }} onClick={() => { setOpen(false); reset() }} />
          <div style={{
            position: 'fixed',
            bottom: 72,
            right: 16,
            zIndex: 51,
            width: 340,
            maxWidth: 'calc(100vw - 32px)',
            background: modalBg,
            borderRadius: 12,
            boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            animation: 'fbModalIn 200ms ease-out',
          }}>
            {/* Header */}
            <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${accentBorder}` }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: subtleText, fontWeight: 500 }}>Make Us Better</span>
              <button onClick={() => { setOpen(false); reset() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: subtleText, fontSize: 18, lineHeight: 1, padding: 0 }}>&times;</button>
            </div>

            {done ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: textColor }}>Thank you!</p>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: subtleText, marginTop: 8 }}>Pastor Tave will review your message.</p>
              </div>
            ) : (
              <div style={{ padding: '16px 20px 20px' }}>
                {/* Category selector */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        borderRadius: 6,
                        border: `1px solid ${category === c.value ? accent : accentBorder}`,
                        background: category === c.value ? accentBg : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        transition: 'border-color 150ms, background 150ms',
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{c.icon}</span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: category === c.value ? accent : subtleText, letterSpacing: '0.5px' }}>{c.label}</span>
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                  maxLength={2000}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    minHeight: 90,
                    maxHeight: 200,
                    padding: '10px 12px',
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 15,
                    color: textColor,
                    background: m ? '#FAFAF9' : '#F5E6C8',
                    border: `1px solid ${accentBorder}`,
                    borderRadius: 6,
                    outline: 'none',
                    lineHeight: 1.6,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = accent }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = accentBorder }}
                />

                {error && (
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#B91C1C', marginTop: 8 }}>{error}</p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || submitting}
                  style={{
                    width: '100%',
                    marginTop: 12,
                    padding: '10px 0',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 11,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    background: accent,
                    border: 'none',
                    borderRadius: 6,
                    cursor: submitting ? 'wait' : 'pointer',
                    opacity: !message.trim() || submitting ? 0.5 : 1,
                    transition: 'opacity 150ms',
                  }}
                >
                  {submitting ? 'Sending...' : 'Send'}
                </button>

                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: subtleText, opacity: 0.5, textAlign: 'center', marginTop: 10 }}>
                  {pathname}
                </p>
              </div>
            )}
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes fbModalIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}} />
        </>
      )}
    </>
  )
}
