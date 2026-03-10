'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

interface AgentResponse {
  answer: string
  routed_to_queue: boolean
  references: string[]
}

export default function AskPage() {
  const [question, setQuestion] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<AgentResponse | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!question.trim() || loading) return

    setLoading(true)
    setError('')
    setResponse(null)

    try {
      const body: Record<string, string> = { question: question.trim() }
      if (email.trim()) body.email = email.trim()

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }

      setResponse(data)
    } catch {
      setError('Failed to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link
        href="/"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        &larr; Home
      </Link>

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

      {response && (
        <div className="space-y-6">
          {response.routed_to_queue && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This question has been routed to our pastoral review queue.
              The response below is a preliminary draft.
            </div>
          )}

          <div className="rounded-xl border border-gray-200 px-5 py-4">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed">
              {response.answer}
            </div>
          </div>

          {response.references.length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Scripture References
              </h3>
              <div className="flex flex-wrap gap-2">
                {response.references.map((ref, i) => (
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
