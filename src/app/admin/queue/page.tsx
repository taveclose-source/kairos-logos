'use client'

import { useState, useEffect } from 'react'

interface QueueItem {
  id: string
  question: string
  ai_draft: string | null
  submitter_email: string | null
  status: string
  submitted_at: string
  reviewed_at: string | null
  approved_answer: string | null
}

export default function AdminQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/queue')
      if (res.status === 401) {
        setError('Access denied. Your account is not authorized for admin access.')
        setLoading(false)
        return
      }
      const data = await res.json()
      setItems(data.items || [])
      setError('')
    } catch {
      setError('Failed to load queue.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(id: string, action: 'approve' | 'dismiss') {
    setActionLoading(id)
    try {
      const body: Record<string, string> = { id, action }
      if (action === 'approve') {
        body.approved_answer = drafts[id] || ''
      }

      const res = await fetch('/api/admin/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Action failed.')
        return
      }

      await refresh()
    } catch {
      setError('Action failed.')
    } finally {
      setActionLoading(null)
    }
  }

  const displayed = filter === 'pending'
    ? items.filter((i) => i.status === 'pending')
    : items

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Theological Queue</h1>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pending ({items.filter((i) => i.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({items.length})
        </button>
      </div>

      {!loading && displayed.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-12">
          {filter === 'pending' ? 'No pending questions.' : 'No questions in the queue.'}
        </p>
      )}

      <div className="space-y-6">
        {displayed.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="px-5 py-3 bg-gray-50 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">
                <StatusBadge status={item.status} />
                <span className="text-xs text-gray-400">
                  {new Date(item.submitted_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                {item.submitter_email && (
                  <span className="text-xs text-gray-500">
                    &middot; {item.submitter_email}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-300 font-mono">{item.id.slice(0, 8)}</span>
            </div>

            <div className="px-5 py-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Question
              </h3>
              <p className="text-sm text-gray-800">{item.question}</p>
            </div>

            {item.ai_draft && (
              <div className="px-5 pb-4">
                <details>
                  <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700">
                    AI Draft Response
                  </summary>
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {item.ai_draft}
                  </p>
                </details>
              </div>
            )}

            {item.approved_answer && (
              <div className="px-5 pb-4">
                <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">
                  Approved Answer
                </h3>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {item.approved_answer}
                </p>
              </div>
            )}

            {item.status === 'pending' && (
              <div className="px-5 pb-4 pt-2 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Approved Answer
                </h3>
                <textarea
                  value={drafts[item.id] ?? item.ai_draft ?? ''}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  rows={5}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-y"
                  placeholder="Type or edit the approved answer..."
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAction(item.id, 'approve')}
                    disabled={actionLoading === item.id || !(drafts[item.id] ?? item.ai_draft)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
                  >
                    {actionLoading === item.id ? 'Saving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleAction(item.id, 'dismiss')}
                    disabled={actionLoading === item.id}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-12 text-xs text-gray-400 text-center">
        Logos by Kai&apos;Ros &middot; Admin
      </p>
    </main>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-gray-100 text-gray-500',
    reviewed: 'bg-blue-100 text-blue-700',
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}
