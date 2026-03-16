'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function MissionsApplyPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [context, setContext] = useState('')
  const [heardFrom, setHeardFrom] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      window.location.href = '/auth/signin?redirect=/missions/apply'
      return
    }
    setSubmitting(true)
    setError(null)

    const supabase = createSupabaseBrowser()
    const { error: dbError } = await supabase
      .from('users')
      .update({
        missions_status: 'pending_approval',
        missions_application: {
          name,
          country,
          ministry_context: context,
          heard_from: heardFrom,
          applied_at: new Date().toISOString(),
        },
      })
      .eq('id', userId)

    if (dbError) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Application Received</h1>
        <p className="text-gray-600 leading-relaxed">
          Your application has been received. Pastor Tave will review it shortly.
          You&rsquo;ll be notified when a sponsor activates your account.
        </p>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-sm font-medium text-amber-600 tracking-wide uppercase">
        Missions Access
      </p>
      <h1 className="text-3xl font-bold mt-2 mb-2">Apply for Sponsored Access</h1>
      <p className="text-gray-500 mb-8">
        Logos Missions provides full platform access at no cost, funded by sponsors
        who believe in getting the Word to those who need it most.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Your Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country / Region
          </label>
          <input
            type="text"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. Ghana, Kumasi"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ministry Context
          </label>
          <textarea
            required
            rows={3}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Tell us briefly about your ministry, church, or how you plan to use Logos"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            How did you hear about Logos?
          </label>
          <input
            type="text"
            value={heardFrom}
            onChange={(e) => setHeardFrom(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>

        {!userId && (
          <p className="text-xs text-gray-400 text-center">
            You&rsquo;ll need to sign in before submitting.
          </p>
        )}
      </form>
    </main>
  )
}
