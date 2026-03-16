'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

interface Applicant {
  id: string
  missions_application: {
    name?: string
    country?: string
    ministry_context?: string
  } | null
}

export default function SponsorPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [sponsoring, setSponsoring] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })

    supabase
      .from('users')
      .select('id, missions_application')
      .eq('missions_status', 'approved')
      .not('missions_application', 'is', null)
      .then(({ data }) => {
        setApplicants((data as Applicant[]) ?? [])
        setLoading(false)
      })
  }, [])

  async function handleSponsor(applicantId: string) {
    if (!userId) {
      window.location.href = '/auth/signin?redirect=/missions/sponsor'
      return
    }
    setSponsoring(applicantId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'missions',
          billing: 'annual',
          userId,
          applicantId,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setSponsoring(null)
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <p className="text-sm font-medium text-amber-600 tracking-wide uppercase">
        Missions Sponsorship
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-2">
        Sponsor a Believer
      </h1>
      <p className="text-gray-500 mb-8 max-w-2xl">
        These believers have been approved for Missions access and are waiting for
        a sponsor. Your one-time $99 gift gives them full Logos access for a year —
        Bible, agent, Strong&rsquo;s, everything.
      </p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading applicants…</p>
      ) : applicants.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
          <p className="text-gray-500 mb-2">No applicants waiting for sponsorship right now.</p>
          <p className="text-sm text-gray-400">
            Check back soon — new applications are reviewed regularly by Pastor Tave.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {applicants.map((a) => {
            const app = a.missions_application
            const firstName = app?.name?.split(' ')[0] ?? 'Applicant'
            return (
              <div
                key={a.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">{firstName}</h3>
                  {app?.country && (
                    <p className="text-sm text-gray-500 mt-0.5">{app.country}</p>
                  )}
                  {app?.ministry_context && (
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-3">
                      {app.ministry_context}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleSponsor(a.id)}
                  disabled={sponsoring === a.id}
                  className="mt-4 w-full py-2.5 rounded-xl bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {sponsoring === a.id ? 'Redirecting…' : 'Sponsor — $99/year'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
