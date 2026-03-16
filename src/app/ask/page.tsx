'use client'

import { useState, useRef, useEffect, FormEvent, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { canUseUnlimitedAsk } from '@/lib/permissions'

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
  const [queryCount, setQueryCount] = useState(0)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Check auth + tier
  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
        const { data } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', user.id)
          .single()
        setUserTier(data?.subscription_tier ?? 'free')
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

    // Free tier: enforce 10 queries/day
    if (!canUseUnlimitedAsk(userTier)) {
      const newCount = queryCount + 1
      if (newCount > 10) {
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
        body: JSON.stringify({ messages: apiMessages }),
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
            Free accounts include 10 questions per day. Upgrade to Scholar for unlimited access,
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

    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-white">
      {/* Page header (below SiteHeader which is h-14 / 3.5rem) */}
      <header className="shrink-0 border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold">Ask the Word</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Confessional Bible assistant &middot; KJV &amp; Textus Receptus
          </p>
        </div>
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
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
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 mb-2">
            {error}
          </div>
        </div>
      )}

      {/* Input bar — fixed at bottom */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-4 sm:px-6 py-3">
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
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '42px', maxHeight: '120px' }}
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
            className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
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
    </div>
    </>
  )
}
