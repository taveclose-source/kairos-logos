'use client'

import { useState, useRef, useEffect, FormEvent, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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

interface UserTopic {
  id: string
  topic: string
  source_session_id: string | null
  created_at: string
}

interface PastSession {
  id: string
  title: string
  messageCount: number
  updatedAt: string
}

function getGreeting(firstName: string) {
  const h = new Date().getHours()
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${time}, ${firstName}. What's on your heart today?`
}

function OilLampIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2c-.5 2-2 3-2 5a2 2 0 0 0 4 0c0-2-1.5-3-2-5z" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="5" ry="2.5" />
      <path d="M7 12v2c0 1.5 2.2 3 5 3s5-1.5 5-3v-2" />
      <path d="M17 11.5l3-2" />
      <path d="M9 17l-1 3h8l-1-3" />
      <line x1="7" y1="20" x2="17" y2="20" />
    </svg>
  )
}

export default function StudyPage() {
  return <Suspense><StudyPageInner /></Suspense>
}

function StudyPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Auth & profile
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [userTier, setUserTier] = useState('free')
  const [lastBook, setLastBook] = useState<string | null>(null)
  const [lastChapter, setLastChapter] = useState<number | null>(null)

  // Topics
  const [topics, setTopics] = useState<UserTopic[]>([])

  // Pastor state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [queryCount, setQueryCount] = useState(0)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [memoryCredits, setMemoryCredits] = useState<number | null>(null)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pastSessions, setPastSessions] = useState<PastSession[]>([])
  const [showSessions, setShowSessions] = useState(false)
  const [lastTopic, setLastTopic] = useState<string | null>(null)

  useTheme() // theme-aware via CSS vars
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pastorRef = useRef<HTMLDivElement>(null)

  // Auth + data loading
  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/signin?redirect=/study'); return }
      setIsLoggedIn(true)
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('users')
        .select('first_name, display_name, subscription_tier, last_read_book, last_read_chapter')
        .eq('id', user.id)
        .single()

      setFirstName(profile?.first_name || profile?.display_name?.split(' ')[0] || 'Friend')
      setUserTier(profile?.subscription_tier ?? 'free')
      setLastBook(profile?.last_read_book ?? null)
      setLastChapter(profile?.last_read_chapter ?? null)

      // Fetch memory
      if (isAdmin(user.id) || ['scholar', 'ministry', 'missions'].includes(profile?.subscription_tier ?? '')) {
        fetch('/api/memory').then(r => r.json()).then(m => {
          setMemoryEnabled(m.memory_enabled)
          setMemoryCredits(m.credits_remaining)
        }).catch(() => {})
      }

      // Fetch topics
      fetch('/api/topics').then(r => r.json()).then(t => {
        if (Array.isArray(t)) setTopics(t)
      }).catch(() => {})

      // Admin: load past sessions
      if (isAdmin(user.id)) {
        fetch('/api/ask/sessions').then(r => r.json()).then(sessions => {
          if (Array.isArray(sessions)) {
            setPastSessions(sessions)
            if (sessions.length > 0) setLastTopic(sessions[0].title?.slice(0, 60) || null)
          }
        }).catch(() => {})
      }

      setAuthChecked(true)
    })
  }, [router])

  // Handle ?q= param — scroll to Pastor and pre-fill
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && messages.length === 0 && authChecked) {
      setInput(q)
      setTimeout(() => pastorRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)
    }
  }, [searchParams, messages.length, authChecked])

  // Auto-scroll chat area
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // ── Pastor chat logic ──
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return

    if (!canUseUnlimitedAsk(userTier, userId)) {
      const newCount = queryCount + 1
      if (newCount > 3) { setShowLimitModal(true); return }
      setQueryCount(newCount)
    }

    const userMessage: Message = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)
    setError('')

    const assistantIdx = updatedMessages.length
    setMessages([...updatedMessages, { role: 'assistant', content: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
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
        setMessages(updatedMessages)
        setLoading(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) { setError('Streaming not supported.'); setMessages(updatedMessages); setLoading(false); return }

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
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') {
              streamed += event.text
              setMessages(prev => { const c = [...prev]; c[assistantIdx] = { ...c[assistantIdx], content: streamed }; return c })
            } else if (event.type === 'done') {
              if (event.sessionId) setSessionId(event.sessionId)
              setMessages(prev => {
                const c = [...prev]
                c[assistantIdx] = { ...c[assistantIdx], references: event.references || [], routedToQueue: event.routed_to_queue }
                return c
              })
              // Fire-and-forget topic extraction
              if (event.sessionId) {
                fetch('/api/topics/extract', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ session_id: event.sessionId }),
                }).catch(() => {})
              }
            } else if (event.type === 'error') {
              setError('The agent encountered an error. Please try again.')
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError('Failed to connect. Please try again.')
      setMessages(prev => prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as unknown as FormEvent) }
  }

  async function resumeSession(sid: string) {
    const res = await fetch(`/api/ask/sessions/${sid}`)
    if (!res.ok) return
    const data = await res.json()
    setSessionId(sid)
    setMessages(data.messages || [])
    setShowSessions(false)
    setTimeout(() => pastorRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function startNewChat() {
    setSessionId(null)
    setMessages([])
    setShowSessions(false)
  }

  // Loading
  if (!authChecked) {
    return <main style={{ background: 'var(--bg-primary)', minHeight: '100vh' }} className="flex items-center justify-center"><p style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading...</p></main>
  }
  if (!isLoggedIn) return null

  const visibleTopics = (isAdmin(userId) || ['scholar', 'ministry', 'missions'].includes(userTier))
    ? topics
    : topics.slice(0, 3)

  return (
    <>
    {/* Daily limit modal */}
    {showLimitModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/30" onClick={() => setShowLimitModal(false)} />
        <div className="relative z-50 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 mx-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2">You&rsquo;ve reached your daily limit</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">Free accounts include 3 questions per day. Upgrade to Scholar for unlimited access.</p>
          <Link href="/pricing" className="block w-full text-center py-3 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors mb-2">See pricing</Link>
          <button onClick={() => setShowLimitModal(false)} className="block w-full text-center py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors">Come back tomorrow</button>
        </div>
      </div>
    )}

    <main style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 56px)' }} className="px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Page title */}
        <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: 28, letterSpacing: '2px', marginBottom: 4 }}>
          {firstName}&apos;s Study
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontSize: 13, marginBottom: '2rem' }}>Your companion in the Word</p>

        {/* ── 1. CONTINUE READING ── */}
        <section style={{ marginBottom: '1.5rem' }}>
          {lastBook ? (
            <Link href={`/bible/${encodeURIComponent(lastBook)}/${lastChapter}`} className="block transition-all duration-200 hover:border-[var(--border-medium)]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1.25rem', textDecoration: 'none' }}>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Continue Reading</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>{lastBook} {lastChapter}</p>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Resume where you left off &rarr;</p>
            </Link>
          ) : (
            <Link href="/toc" className="block transition-all duration-200 hover:border-[var(--border-medium)]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1.25rem', textDecoration: 'none' }}>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Start Reading</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>Open the Bible</p>
            </Link>
          )}
        </section>

        {/* ── 2. READ ── */}
        <section style={{ marginBottom: '1.5rem' }}>
          <Link href="/toc" className="block transition-all duration-200 hover:border-[var(--border-medium)]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1.25rem', textDecoration: 'none' }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>Read</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-primary)' }}>Table of Contents &rarr;</p>
          </Link>
        </section>

        {/* ── 3. STUDY FURTHER ── */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '2px', color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Study Further</h2>
          {visibleTopics.length === 0 ? (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1.25rem', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                Your study topics will appear here as you converse with the Pastor below.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {visibleTopics.map(t => (
                <div key={t.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{t.topic}</span>
                  <button
                    onClick={() => {
                      setInput(`Tell me more about ${t.topic}`)
                      setTimeout(() => pastorRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
                    }}
                    style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)', background: 'rgba(200,150,10,0.08)', border: '1px solid rgba(200,150,10,0.2)', borderRadius: 3, padding: '2px 8px', cursor: 'pointer' }}
                  >
                    Go Deeper
                  </button>
                </div>
              ))}
            </div>
          )}
          {!isAdmin(userId) && userTier === 'free' && topics.length > 3 && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 8 }}>
              Upgrade to Scholar to see all {topics.length} topics. <Link href="/pricing" style={{ color: 'var(--gold)' }}>See plans</Link>
            </p>
          )}
        </section>

        {/* ── 4. THE PASTOR ── */}
        <section ref={pastorRef} id="pastor" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '2px', color: 'var(--text-primary)', textTransform: 'uppercase' }}>The Pastor</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isAdmin(userId) && (
                <>
                  <button onClick={startNewChat} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--gold)', background: 'rgba(200,150,10,0.08)', border: '1px solid rgba(200,150,10,0.2)', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>+ New</button>
                  <button onClick={() => setShowSessions(!showSessions)} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--gold)', background: 'rgba(200,150,10,0.08)', border: '1px solid rgba(200,150,10,0.2)', borderRadius: 3, padding: '2px 8px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase' }}>Past conversations</button>
                </>
              )}
              {memoryEnabled && memoryCredits !== null && (
                <a href="/settings/memory" style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--gold)', textDecoration: 'none' }}>
                  {memoryCredits} credits
                </a>
              )}
            </div>
          </div>

          {/* Past sessions drawer */}
          {showSessions && isAdmin(userId) && (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '0.75rem', marginBottom: '0.75rem', maxHeight: 200, overflowY: 'auto' }}>
              {pastSessions.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-tertiary)' }}>No past sessions.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {pastSessions.map(s => (
                    <button key={s.id} onClick={() => resumeSession(s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 3, cursor: 'pointer', background: sessionId === s.id ? 'rgba(200,150,10,0.1)' : 'transparent', border: 'none', textAlign: 'left', width: '100%' }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{s.title}</span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{new Date(s.updatedAt).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat container */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, overflow: 'hidden' }}>
            {/* Chat messages */}
            <div ref={scrollRef} style={{ maxHeight: 500, overflowY: 'auto', padding: '1.25rem' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <OilLampIcon className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.7 }}>
                    {getGreeting(firstName)}
                  </p>
                  {memoryEnabled && lastTopic && (
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                      Last time we were in <em>{lastTopic.slice(0, 60)}</em>.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i}>
                      {msg.role === 'user' ? (
                        <div style={{ marginBottom: 12 }}>
                          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>{firstName}</p>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7 }}>{msg.content}</p>
                        </div>
                      ) : (
                        <div style={{ marginBottom: 12, paddingLeft: '0.75rem', borderLeft: '2px solid var(--gold-border, rgba(200,160,40,0.3))' }}>
                          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>Pastor</p>
                          {msg.routedToQueue && (
                            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--gold)', fontStyle: 'italic', marginBottom: 6 }}>
                              This question has been routed to pastoral review. Below is a preliminary response.
                            </p>
                          )}
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                            {loading && i === messages.length - 1 && (
                              <span className="inline-block w-1.5 h-4 bg-amber-400 animate-pulse ml-0.5 align-text-bottom" />
                            )}
                          </div>
                          {msg.references && msg.references.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                              {msg.references.map((ref, j) => (
                                <span key={j} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-secondary)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 3, padding: '2px 6px' }}>{ref}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {messages.length >= 2 && !memoryEnabled && ['scholar', 'ministry', 'missions'].includes(userTier) && (
                    <MemoryBanner onEnable={() => setShowCreditModal(true)} />
                  )}
                  {error && (
                    <div style={{ borderRadius: 4, border: '1px solid rgba(220,50,50,0.2)', background: 'rgba(220,50,50,0.05)', padding: '8px 12px', fontFamily: 'var(--font-ui)', fontSize: 12, color: '#c33' }}>{error}</div>
                  )}
                </div>
              )}
            </div>

            {/* Input area */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '0.75rem 1.25rem' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a Bible question..."
                    rows={1}
                    maxLength={2000}
                    disabled={loading}
                    className="w-full resize-none disabled:opacity-50"
                    style={{
                      minHeight: 40, maxHeight: 100,
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 4,
                      padding: '10px 40px 10px 12px',
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 16,
                      outline: 'none',
                    }}
                    onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }}
                  />
                  {input.length > 0 && <span style={{ position: 'absolute', right: 8, bottom: 6, fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--text-tertiary)' }}>{input.length}/2000</span>}
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="shrink-0 disabled:opacity-40 transition-colors"
                  style={{ padding: '0 16px', minHeight: 40, borderRadius: 4, background: 'var(--gold)', color: '#2C1810', fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500, border: 'none', cursor: 'pointer' }}
                >
                  {loading ? '...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center" style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', letterSpacing: '2px' }}>
          LOGOS BY KAI&apos;ROS &middot; YOUR STUDY, HIS WORD
        </p>
      </div>
    </main>

    {showCreditModal && <CreditPurchaseModal onClose={() => setShowCreditModal(false)} />}
    </>
  )
}
