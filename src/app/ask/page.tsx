'use client'

import { useState, useRef, useEffect, FormEvent, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { canUseUnlimitedAsk, isAdmin } from '@/lib/permissions'
import MemoryBanner from '@/components/MemoryBanner'
import CreditPurchaseModal from '@/components/CreditPurchaseModal'
import { useTheme } from '@/contexts/ThemeContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
  references?: string[]
  routedToQueue?: boolean
}

function OilLampIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Flame */}
      <path d="M12 2c-.5 2-2 3-2 5a2 2 0 0 0 4 0c0-2-1.5-3-2-5z" fill="currentColor" />
      {/* Lamp body */}
      <ellipse cx="12" cy="12" rx="5" ry="2.5" />
      <path d="M7 12v2c0 1.5 2.2 3 5 3s5-1.5 5-3v-2" />
      {/* Spout */}
      <path d="M17 11.5l3-2" />
      {/* Base */}
      <path d="M9 17l-1 3h8l-1-3" />
      <line x1="7" y1="20" x2="17" y2="20" />
    </svg>
  )
}

export default function AskPage() {
  return (
    <Suspense>
      <AskPageInner />
    </Suspense>
  )
}

function AskPageInner() {
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userTier, setUserTier] = useState('free')
  const [userId, setUserId] = useState<string | null>(null)
  const [queryCount, setQueryCount] = useState(0)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [memoryCredits, setMemoryCredits] = useState<number | null>(null)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pastSessions, setPastSessions] = useState<{ id: string; title: string; messageCount: number; updatedAt: string }[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const { theme } = useTheme()
  const isModern = theme === 'modern'
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Check auth + tier
  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
        setUserId(user.id)
        const { data } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', user.id)
          .single()
        setUserTier(data?.subscription_tier ?? 'free')
        // Fetch memory credits — admin always gets access
        if (isAdmin(user.id) || ['scholar', 'ministry', 'missions'].includes(data?.subscription_tier ?? '')) {
          fetch('/api/memory').then(r => r.json()).then(m => {
            setMemoryEnabled(m.memory_enabled)
            setMemoryCredits(m.credits_remaining)
          }).catch(() => {})
        }
        // Admin: load past sessions for cross-session resumption
        if (isAdmin(user.id)) {
          fetch('/api/ask/sessions').then(r => r.json()).then(sessions => {
            if (Array.isArray(sessions)) setPastSessions(sessions)
          }).catch(() => {})
        }
      }
      setAuthChecked(true)
    })
  }, [])

  // Pre-populate input from ?q= query parameter (e.g. from Strong's popup)
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && messages.length === 0) {
      setInput(q)
      inputRef.current?.focus()
    }
  }, [searchParams, messages.length])

  // Auto-scroll to bottom when messages change or during streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return

    // Free tier: enforce query limit — admin bypasses
    if (!canUseUnlimitedAsk(userTier, userId)) {
      const newCount = queryCount + 1
      if (newCount > 3) {
        setShowLimitModal(true)
        return
      }
      setQueryCount(newCount)
    }

    const userMessage: Message = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)
    setError('')

    // Add placeholder assistant message for streaming
    const assistantIdx = updatedMessages.length
    setMessages([...updatedMessages, { role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Build the messages payload for the API (only role + content)
      const apiMessages = updatedMessages.map(({ role, content }) => ({ role, content }))

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, sessionId: sessionId || undefined }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong.')
        // Remove the placeholder
        setMessages(updatedMessages)
        setLoading(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setError('Streaming not supported.')
        setMessages(updatedMessages)
        setLoading(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let streamed = ''

      while (true) {
        const { done: readerDone, value } = await reader.read()
        if (readerDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6)
          try {
            const event = JSON.parse(json)
            if (event.type === 'text') {
              streamed += event.text
              setMessages((prev) => {
                const copy = [...prev]
                copy[assistantIdx] = { ...copy[assistantIdx], content: streamed }
                return copy
              })
            } else if (event.type === 'done') {
              if (event.sessionId) setSessionId(event.sessionId)
              setMessages((prev) => {
                const copy = [...prev]
                copy[assistantIdx] = {
                  ...copy[assistantIdx],
                  references: event.references || [],
                  routedToQueue: event.routed_to_queue,
                }
                return copy
              })
            } else if (event.type === 'error') {
              setError('The agent encountered an error. Please try again.')
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('Failed to connect. Please try again.')
      }
      // If errored, remove empty placeholder
      setMessages((prev) =>
        prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev
      )
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  async function resumeSession(sid: string) {
    const res = await fetch(`/api/ask/sessions/${sid}`)
    if (!res.ok) return
    const data = await res.json()
    setSessionId(sid)
    setMessages(data.messages || [])
    setShowSessions(false)
  }

  function startNewChat() {
    setSessionId(null)
    setMessages([])
    setShowSessions(false)
  }

  // Wait for auth check
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  // Guest preview
  if (!isLoggedIn) {
    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <OilLampIcon className="w-14 h-14 text-amber-400 mx-auto mb-6" />
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Ask the Word</h1>
        <p className="text-gray-500 mb-10 max-w-lg mx-auto">
          A KJV theological agent — built on the Textus Receptus, grounded in the preserved Word.
        </p>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-5 text-left mb-10">
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Example Question</p>
            <p className="text-sm text-gray-800 font-medium">Who was with Paul and Silas in Philippi?</p>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Logos</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Timothy joined Paul and Silas at Lystra in Acts 16:1-3, and traveled with them to Philippi
              which they reached in Acts 16:12 — before the imprisonment at Acts 16:19.
            </p>
          </div>
        </div>

        <Link
          href="/auth/signup?redirect=/ask"
          className="inline-block px-6 py-3 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition-colors"
        >
          Create a free account to ask your own question
        </Link>
        <p className="mt-3 text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/auth/signin?redirect=/ask" className="text-gray-600 underline hover:text-gray-800">
            Sign in
          </Link>
        </p>
      </main>
    )
  }

  return (
    <>
    {/* Daily limit modal */}
    {showLimitModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/30" onClick={() => setShowLimitModal(false)} />
        <div className="relative z-50 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 mx-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2">You&rsquo;ve reached your daily limit</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Free accounts include 3 questions per day. Upgrade to Scholar for unlimited access,
            Pastor Tave&rsquo;s voice, and the full Pastor&rsquo;s Helps module.
          </p>
          <Link
            href="/pricing"
            className="block w-full text-center py-3 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors mb-2"
          >
            See pricing
          </Link>
          <button
            onClick={() => setShowLimitModal(false)}
            className="block w-full text-center py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Come back tomorrow
          </button>
        </div>
      </div>
    )}

    <div style={{
      position: 'relative',
      minHeight: '100vh',
      overflow: 'hidden',
    }}>
      {/* Background */}
      {isModern ? (
        <div style={{ position: 'fixed', inset: 0, background: '#0F3460', zIndex: -1 }} />
      ) : (
        <img src="/images/ask-backdrop.png" alt="" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', objectFit: 'cover', objectPosition: 'center 75%', zIndex: -1 }} />
      )}
      {/* Dark overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,6,2,0.55)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Inner layout wrapper */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Page header */}
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(139,107,20,0.2)', flexShrink: 0 }}>
        <div className="max-w-3xl mx-auto">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Ask the Word</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isAdmin(userId) && (
                <>
                  <button onClick={startNewChat} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--gold)', background: 'rgba(200,150,10,0.1)', border: '1px solid rgba(200,150,10,0.3)', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    + New
                  </button>
                  <button onClick={() => setShowSessions(!showSessions)} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--gold)', background: 'rgba(200,150,10,0.1)', border: '1px solid rgba(200,150,10,0.3)', borderRadius: 3, padding: '3px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    History ({pastSessions.length})
                  </button>
                </>
              )}
              {memoryEnabled && memoryCredits !== null && (
                <a href="/settings/memory" style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--gold)', textDecoration: 'none' }}>
                  ⚡ {memoryCredits} credits
                </a>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Confessional Bible assistant &middot; KJV &amp; Textus Receptus
          </p>
        </div>
      </header>

      {/* Admin: Past sessions drawer */}
      {showSessions && isAdmin(userId) && (
        <div style={{ background: 'rgba(15,6,2,0.9)', borderBottom: '1px solid rgba(139,107,20,0.3)', padding: '0.75rem 1.5rem', maxHeight: '40vh', overflowY: 'auto' }}>
          <div className="max-w-3xl mx-auto">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(200,150,10,0.7)' }}>Past Conversations</span>
              <button onClick={() => setShowSessions(false)} style={{ color: 'rgba(255,208,64,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>&times;</button>
            </div>
            {pastSessions.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>No past sessions found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {pastSessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => resumeSession(s.id)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', borderRadius: 4, cursor: 'pointer',
                      background: sessionId === s.id ? 'rgba(200,150,10,0.15)' : 'transparent',
                      border: sessionId === s.id ? '1px solid rgba(200,150,10,0.3)' : '1px solid transparent',
                      textAlign: 'left', width: '100%',
                    }}
                    onMouseEnter={(e) => { if (sessionId !== s.id) e.currentTarget.style.background = 'rgba(200,150,10,0.08)' }}
                    onMouseLeave={(e) => { if (sessionId !== s.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {s.title}
                    </span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                      {s.messageCount} msgs &middot; {new Date(s.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat area */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem', maxHeight: 'calc(100vh - 240px)' }}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <OilLampIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">
                Ask a question about Scripture. Logos will answer from the KJV and Textus Receptus.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === 'user' ? (
                /* User bubble — right aligned */
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gray-900 text-white px-4 py-3 text-sm whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              ) : (
                /* Agent bubble — left aligned */
                <div className="flex justify-start gap-2.5">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mt-0.5">
                    <OilLampIcon className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="max-w-[80%] space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                      Logos
                    </span>

                    {msg.routedToQueue && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        This question has been routed to pastoral review. The response below is a preliminary draft.
                      </div>
                    )}

                    <div className="rounded-2xl rounded-bl-md bg-gray-50 border border-gray-100 px-4 py-3">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
                        {msg.content}
                        {loading && i === messages.length - 1 && (
                          <span className="inline-block w-1.5 h-4 bg-amber-400 animate-pulse ml-0.5 align-text-bottom" />
                        )}
                      </div>
                    </div>

                    {msg.references && msg.references.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {msg.references.map((ref, j) => (
                          <span
                            key={j}
                            className="inline-block px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] text-gray-600"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {/* Memory banner — show after first response for Scholar+ without memory */}
          {messages.length >= 2 && !memoryEnabled && ['scholar', 'ministry', 'missions'].includes(userTier) && (
            <MemoryBanner onEnable={() => setShowCreditModal(true)} />
          )}
          {/* Error banner */}
          {error && (
            <div className="max-w-3xl mx-auto rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 mt-2">
              {error}
            </div>
          )}
        </div>
      </div>

      </div>{/* end inner layout wrapper */}

      {/* Input bar — fixed at bottom */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '12px 16px', background: 'rgba(15,6,2,0.75)', backdropFilter: 'blur(8px)' }}>
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a Bible question..."
              rows={1}
              maxLength={2000}
              disabled={loading}
              className="w-full resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                minHeight: '44px', maxHeight: '120px',
                background: '#F5EDD9',
                color: '#2C1810',
                border: '1px solid rgba(139,107,20,0.4)',
                borderRadius: '4px',
                padding: '12px 48px 12px 16px',
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '16px',
                caretColor: '#8B6914',
                outline: 'none',
              }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
            />
            <span className="absolute right-3 bottom-2 text-[10px] text-gray-300">
              {input.length > 0 && `${input.length}/2000`}
            </span>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ padding: '0 20px', minHeight: '44px', borderRadius: '4px', background: 'var(--gold)', color: '#2C1810', fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500, border: 'none', cursor: 'pointer' }}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="sr-only">Searching...</span>
              </span>
            ) : (
              'Send'
            )}
          </button>
        </form>
        <p className="max-w-3xl mx-auto mt-2 text-[10px] text-gray-300 text-center">
          Logos by Kai&apos;Ros &middot; &ldquo;Sanctify them through thy truth: thy word is truth.&rdquo; &mdash; John 17:17
        </p>
      </div>
      {/* Credit purchase modal */}
      {showCreditModal && <CreditPurchaseModal onClose={() => setShowCreditModal(false)} />}
      {/* end outer container */}
    </div>
    </>
  )
}
