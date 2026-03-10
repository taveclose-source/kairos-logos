'use client'

import { useState, useRef, FormEvent } from 'react'

export default function AskPage() {
  const [question, setQuestion] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamedAnswer, setStreamedAnswer] = useState('')
  const [routedToQueue, setRoutedToQueue] = useState(false)
  const [references, setReferences] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!question.trim() || loading) return

    setLoading(true)
    setError('')
    setStreamedAnswer('')
    setRoutedToQueue(false)
    setReferences([])
    setDone(false)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const body: Record<string, string> = { question: question.trim() }
      if (email.trim()) body.email = email.trim()

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong.')
        setLoading(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setError('Streaming not supported.')
        setLoading(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

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
              setStreamedAnswer((prev) => prev + event.text)
            } else if (event.type === 'done') {
              setRoutedToQueue(event.routed_to_queue)
              setReferences(event.references || [])
              setDone(true)
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
    } finally {
      setLoading(false)
      setDone(true)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-1">
        Ask the Word
      </h1>
      <p className="text-gray-500 mb-8">
        Confessional Bible assistant &middot; KJV &amp; Textus Receptus
      </p>

      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a Bible question..."
          rows={3}
          maxLength={2000}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional) — get notified if your question goes to pastoral review"
          className="w-full mt-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">
            {question.length}/2000
          </span>
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Searching the Word...' : 'Ask'}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {streamedAnswer && (
        <div className="space-y-6">
          {routedToQueue && done && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This question has been routed to our pastoral review queue.
              The response below is a preliminary draft.
            </div>
          )}

          <div className="rounded-xl border border-gray-200 px-5 py-4">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed">
              {streamedAnswer}
              {loading && (
                <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          </div>

          {done && references.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Scripture References
              </h3>
              <div className="flex flex-wrap gap-2">
                {references.map((ref, i) => (
                  <span
                    key={i}
                    className="inline-block px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs text-gray-700"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-12 text-xs text-gray-400 text-center">
        Logos by Kai&apos;Ros &middot; &ldquo;Sanctify them through thy truth: thy word is truth.&rdquo; &mdash; John 17:17
      </p>
    </main>
  )
}
