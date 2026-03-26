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
  mention_count: number
  last_mentioned_at: string
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
  const userScrolledUp = useRef(false)
  const [showJumpPill, setShowJumpPill] = useState(false)

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

      // Fetch topics directly from Supabase
      supabase.from('user_topics')
        .select('id, topic, source_session_id, created_at, mention_count, last_mentioned_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
        .then(({ data: topicData, error: topicErr }) => {
          console.log('[Study] topics query:', { userId: user.id, data: topicData, error: topicErr })
          if (topicData && Array.isArray(topicData) && topicData.length > 0) {
            setTopics(topicData)
          }
        })

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

  // Smart auto-scroll — follows stream unless user scrolls up
  useEffect(() => {
    if (!scrollRef.current || userScrolledUp.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Detect user scroll: if they scroll up, stop auto-scroll; if near bottom, re-enable
  function handleChatScroll() {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distFromBottom > 100) {
      userScrolledUp.current = true
      if (loading) setShowJumpPill(true)
    } else {
      userScrolledUp.current = false
      setShowJumpPill(false)
    }
  }

  function jumpToLatest() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      userScrolledUp.current = false
      setShowJumpPill(false)
    }
  }

  // Hide pill when streaming ends and user is near bottom
  useEffect(() => {
    if (!loading) {
      const el = scrollRef.current
      if (el) {
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
        if (distFromBottom <= 100) setShowJumpPill(false)
      }
    }
  }, [loading])

  // ── Pastor chat logic ──
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return
    // Reset scroll tracking for new response
    userScrolledUp.current = false
    setShowJumpPill(false)

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

  const showCredits = memoryEnabled && memoryCredits !== null && !isAdmin(userId)

  return (
    <>
    {/* Daily limit modal */}
    {showLimitModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/30" onClick={() => setShowLimitModal(false)} />
        <div className="relative z-50 w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4" style={{ background: '#F8F2E2' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#1A0A04', marginBottom: 8 }}>You&rsquo;ve reached your daily limit</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#5C3D11', lineHeight: 1.7, marginBottom: 20 }}>Free accounts include 3 questions per day. Upgrade to Scholar for unlimited access.</p>
          <Link href="/pricing" className="block w-full text-center py-3 transition-colors" style={{ background: 'rgba(200,150,10,0.15)', border: '1px solid rgba(200,150,10,0.4)', color: '#8B6914', fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', borderRadius: 3, textDecoration: 'none', marginBottom: 8 }}>See pricing</Link>
          <button onClick={() => setShowLimitModal(false)} className="block w-full text-center py-3 transition-colors" style={{ background: 'transparent', border: 'none', color: 'rgba(139,107,20,0.5)', fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '1px', cursor: 'pointer' }}>Come back tomorrow</button>
        </div>
      </div>
    )}

    {/* Background — same image and overlay from the original /ask page */}
    <img src="/images/ask-backdrop.png" alt="" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', objectFit: 'cover', objectPosition: 'center 75%', zIndex: -2 }} />
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,6,2,0.75)', pointerEvents: 'none', zIndex: -1 }} />

    <main style={{ position: 'relative', minHeight: 'calc(100vh - 56px)' }} className="px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-2xl mx-auto">

        {/* ── NAMEPLATE ── */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 42,
            fontWeight: 300,
            color: '#FFFFFF',
            letterSpacing: '3px',
            lineHeight: 1.1,
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
          }}>
            {firstName}&apos;s Study
          </h1>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 15,
            fontStyle: 'italic',
            color: 'rgba(255,208,96,0.75)',
            marginTop: 6,
            letterSpacing: '1px',
          }}>
            Your companion in the Word
          </p>
          {/* Ornamental rule */}
          <div style={{ width: 60, height: 1, background: 'linear-gradient(to right, transparent, rgba(200,160,40,0.4), transparent)', margin: '1.25rem auto 0' }} />
        </div>

        {/* ── 1. CONTINUE READING — bookmark style ── */}
        <section style={{ marginBottom: '2.5rem' }}>
          {lastBook ? (
            <Link href={`/bible/${encodeURIComponent(lastBook)}/${lastChapter}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                padding: '1.5rem 1.75rem',
                borderLeft: '3px solid rgba(255,200,100,0.5)',
                border: '1px solid rgba(255,200,100,0.15)',
                borderLeftWidth: 3,
                borderLeftColor: 'rgba(255,200,100,0.5)',
                borderRadius: 4,
                background: 'rgba(15,6,2,0.6)',
                transition: 'border-color 200ms, background 200ms',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderLeftColor = '#FFD060'; e.currentTarget.style.background = 'rgba(15,6,2,0.7)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderLeftColor = 'rgba(255,200,100,0.5)'; e.currentTarget.style.background = 'rgba(15,6,2,0.6)' }}
              >
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,208,96,0.8)', marginBottom: 8 }}>Continue Reading</p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 400, color: '#FFFFFF', lineHeight: 1.2 }}>{lastBook}</p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, color: 'rgba(255,230,180,0.7)', marginTop: 2 }}>Chapter {lastChapter}</p>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: '#FFD060', marginTop: 12, letterSpacing: '1px' }}>Resume &rarr;</p>
              </div>
            </Link>
          ) : (
            <Link href="/toc" style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ padding: '1.5rem 1.75rem', borderLeft: '3px solid rgba(255,200,100,0.35)', border: '1px solid rgba(255,200,100,0.15)', borderLeftWidth: 3, borderLeftColor: 'rgba(255,200,100,0.35)', borderRadius: 4, background: 'rgba(15,6,2,0.6)', transition: 'border-color 200ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderLeftColor = '#FFD060' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderLeftColor = 'rgba(255,200,100,0.35)' }}
              >
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: '#FFFFFF' }}>Open the Bible</p>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,208,96,0.7)', marginTop: 4, letterSpacing: '1px' }}>Begin reading &rarr;</p>
              </div>
            </Link>
          )}
        </section>

        {/* ── 2. READ — book spine link ── */}
        <section style={{ marginBottom: '2.5rem' }}>
          <Link href="/toc" style={{ textDecoration: 'none', display: 'block', padding: '1rem 1.5rem', background: 'rgba(15,6,2,0.6)', border: '1px solid rgba(255,200,100,0.15)', borderRadius: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 3, height: 24, background: 'rgba(255,200,100,0.35)', borderRadius: 1, display: 'inline-block' }} />
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: 'rgba(255,230,180,0.95)', letterSpacing: '0.5px' }}>Table of Contents</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,208,96,0.7)' }}>&rarr;</span>
            </div>
          </Link>
        </section>

        {/* ── 3. STUDY FURTHER ── */}
        <section style={{ marginBottom: '3rem', padding: '1.5rem', background: 'rgba(15,6,2,0.6)', border: '1px solid rgba(255,200,100,0.15)', borderRadius: 4 }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,208,96,0.8)', marginBottom: '1rem' }}>Study Further</p>
          {visibleTopics.length === 0 ? (
            <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>&#128367;</div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontStyle: 'italic', color: 'rgba(255,230,180,0.85)', lineHeight: 1.7 }}>
                Your study topics will appear here<br />as you walk with the Pastor.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {visibleTopics.map(t => (
                <div key={t.id} style={{
                  background: 'rgba(255,200,100,0.08)',
                  border: '1px solid rgba(255,200,100,0.2)',
                  borderRadius: 3,
                  padding: '10px 16px',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: 'rgba(255,230,180,0.95)', textTransform: 'capitalize' }}>{t.topic}</span>
                    <button
                      onClick={() => {
                        setInput(`Tell me more about ${t.topic}`)
                        setTimeout(() => pastorRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
                      }}
                      style={{ fontFamily: 'var(--font-ui)', fontSize: 8, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#FFD060', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Go Deeper &rarr;
                    </button>
                  </div>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, color: 'rgba(255,208,96,0.4)', letterSpacing: '0.5px' }}>
                    {t.mention_count} conversation{t.mention_count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!isAdmin(userId) && userTier === 'free' && topics.length > 3 && (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'rgba(200,160,40,0.4)', marginTop: 10 }}>
              Upgrade to see all {topics.length} topics. <Link href="/pricing" style={{ color: '#FFD060', textDecoration: 'none' }}>See plans</Link>
            </p>
          )}
        </section>

        {/* Divider before Pastor */}
        <div style={{ width: '100%', height: 1, background: 'linear-gradient(to right, transparent, rgba(200,160,40,0.2), transparent)', marginBottom: '2.5rem' }} />

        {/* ── 4. THE PASTOR ── */}
        <section ref={pastorRef} id="pastor" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(15,6,2,0.6)', border: '1px solid rgba(255,200,100,0.15)', borderRadius: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(255,208,96,0.8)' }}>The Pastor</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isAdmin(userId) && (
                <>
                  <button onClick={startNewChat} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(255,208,96,0.7)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '1px' }}>+ New</button>
                  <button onClick={() => setShowSessions(!showSessions)} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(255,208,96,0.7)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '1px', textDecoration: 'underline', textDecorationColor: 'rgba(255,208,96,0.3)', textUnderlineOffset: '2px' }}>Past conversations</button>
                </>
              )}
              {showCredits && (
                <a href="/settings/memory" style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(200,160,40,0.35)', textDecoration: 'none' }}>{memoryCredits} credits</a>
              )}
            </div>
          </div>

          {/* Past sessions drawer */}
          {showSessions && isAdmin(userId) && (
            <div style={{ borderLeft: '2px solid rgba(255,200,100,0.2)', paddingLeft: '1rem', marginBottom: '1.25rem', maxHeight: 200, overflowY: 'auto' }}>
              {pastSessions.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'rgba(255,208,96,0.5)' }}>No past sessions.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {pastSessions.map(s => (
                    <button key={s.id} onClick={() => resumeSession(s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', width: '100%', opacity: sessionId === s.id ? 1 : 0.5, transition: 'opacity 150ms' }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={(e) => { if (sessionId !== s.id) e.currentTarget.style.opacity = '0.5' }}
                    >
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: 'rgba(255,230,180,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{s.title}</span>
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(255,208,96,0.5)', whiteSpace: 'nowrap' }}>{new Date(s.updatedAt).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conversation area */}
          <div ref={scrollRef} onScroll={handleChatScroll} style={{ maxHeight: 600, overflowY: 'auto', paddingBottom: '1rem', position: 'relative' }}>
            {messages.length === 0 ? (
              <div style={{ padding: '2.5rem 0', textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,208,96,0.8)' }}><OilLampIcon className="w-16 h-16 mx-auto mb-5" /></div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: '#FFFFFF', lineHeight: 1.6, textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
                  {getGreeting(firstName)}
                </p>
                {memoryEnabled && lastTopic && (
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontStyle: 'italic', color: 'rgba(255,208,96,0.7)', marginTop: 12 }}>
                    Last time we were in <em>&ldquo;{lastTopic.slice(0, 60)}&rdquo;</em>.
                  </p>
                )}
              </div>
            ) : (
              <div>
                {messages.map((msg, i) => (
                  <div key={i}>
                    {msg.role === 'user' ? (
                      <div style={{ marginBottom: 20, marginTop: i > 0 ? 20 : 0 }}>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,208,96,0.6)', marginBottom: 4 }}>{firstName}</p>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: 'rgba(255,230,180,0.95)', lineHeight: 1.7 }}>{msg.content}</p>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 20, paddingLeft: '1rem', borderLeft: '2px solid rgba(255,200,100,0.3)' }}>
                        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,208,96,0.85)', marginBottom: 6 }}>Pastor</p>
                        {msg.routedToQueue && (
                          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: 'rgba(255,208,96,0.5)', fontStyle: 'italic', marginBottom: 8 }}>
                            This question has been routed to pastoral review. Below is a preliminary response.
                          </p>
                        )}
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, color: 'rgba(255,230,180,0.95)', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                          {loading && i === messages.length - 1 && (
                            <span className="inline-block w-1.5 h-5 animate-pulse ml-0.5 align-text-bottom" style={{ borderRadius: 1, background: 'rgba(255,208,96,0.6)' }} />
                          )}
                        </div>
                        {msg.references && msg.references.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                            {msg.references.map((ref, j) => (
                              <span key={j} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'rgba(255,208,96,0.65)', letterSpacing: '0.5px' }}>{ref}</span>
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
                  <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'rgba(220,100,80,0.8)', fontStyle: 'italic', marginTop: 8 }}>{error}</p>
                )}
              </div>
            )}
          </div>

          {/* Jump to latest pill — appears when user scrolls up during streaming */}
          {showJumpPill && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
              <button
                onClick={jumpToLatest}
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 9,
                  letterSpacing: '1px',
                  color: '#FFD060',
                  background: 'rgba(30,14,3,0.7)',
                  border: '1px solid rgba(255,208,96,0.3)',
                  borderRadius: 12,
                  padding: '4px 14px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(30,14,3,0.9)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30,14,3,0.7)' }}
              >
                Jump to latest &darr;
              </button>
            </div>
          )}

          {/* Input — journal line style against dark bg */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: '0.5rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What question is on your heart?"
                rows={1}
                maxLength={2000}
                disabled={loading}
                className="w-full resize-none disabled:opacity-50"
                style={{
                  minHeight: 36,
                  maxHeight: 100,
                  background: 'transparent',
                  color: 'rgba(255,230,180,0.95)',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,200,100,0.3)',
                  borderRadius: 0,
                  padding: '8px 0',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 17,
                  outline: 'none',
                  caretColor: '#FFD060',
                }}
                onInput={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px' }}
                onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'rgba(255,208,96,0.5)' }}
                onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'rgba(200,160,40,0.25)' }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="shrink-0 disabled:opacity-30 transition-opacity"
              style={{
                padding: '6px 0',
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-ui)',
                fontSize: 10,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: '#FFD060',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {loading ? '...' : 'Ask'}
            </button>
          </form>
        </section>

        {/* Footer inscription */}
        <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem' }}>
          <div style={{ width: 40, height: 1, background: 'linear-gradient(to right, transparent, rgba(200,160,40,0.25), transparent)', margin: '0 auto 1rem' }} />
          <p style={{ fontSize: 10, color: 'rgba(200,160,40,0.25)', fontFamily: 'var(--font-ui)', letterSpacing: '3px' }}>
            LOGOS BY KAI&apos;ROS &middot; YOUR STUDY. HIS WORD.
          </p>
        </div>
      </div>
    </main>

    {showCreditModal && <CreditPurchaseModal onClose={() => setShowCreditModal(false)} />}
    </>
  )
}
