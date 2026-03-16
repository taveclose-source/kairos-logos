'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

type Tab = 'users' | 'missions' | 'sponsorships' | 'revenue'

interface UserRow {
  id: string
  email: string
  subscription_tier: string | null
  subscription_status: string | null
  missions_status: string | null
  missions_application: Record<string, string> | null
  created_at: string
}

interface Sponsorship {
  id: string
  sponsor_id: string
  recipient_id: string
  amount_cents: number
  created_at: string
  expires_at: string
  sponsor_email?: string
  recipient_email?: string
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'missions', label: 'Missions Queue' },
  { id: 'sponsorships', label: 'Sponsorships' },
  { id: 'revenue', label: 'Revenue' },
]

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<UserRow[]>([])
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const sb = createSupabaseBrowser()
    const { data: userData } = await sb
      .from('users')
      .select('id, email, subscription_tier, subscription_status, missions_status, missions_application, created_at')
      .order('created_at', { ascending: false })
    setUsers((userData as UserRow[]) ?? [])

    const { data: sponsorData } = await sb
      .from('missions_sponsorships')
      .select('*')
      .order('created_at', { ascending: false })
    setSponsorships((sponsorData as Sponsorship[]) ?? [])

    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Missions queue actions
  async function approveMission(userId: string) {
    const sb = createSupabaseBrowser()
    await sb.from('users').update({
      missions_status: 'approved',
    }).eq('id', userId)
    loadData()
  }

  async function denyMission(userId: string) {
    const sb = createSupabaseBrowser()
    await sb.from('users').update({
      missions_status: 'denied',
    }).eq('id', userId)
    loadData()
  }

  // Filtered data
  const filteredUsers = search
    ? users.filter((u) =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.subscription_tier?.toLowerCase().includes(search.toLowerCase())
      )
    : users

  const pendingMissions = users.filter((u) => u.missions_status === 'pending_approval')

  // Revenue calculations
  const tierCounts = {
    scholar_monthly: users.filter((u) => u.subscription_tier === 'scholar' && u.subscription_status === 'active').length,
    ministry_monthly: users.filter((u) => u.subscription_tier === 'ministry' && u.subscription_status === 'active').length,
    missions_active: users.filter((u) => u.subscription_tier === 'missions' && u.subscription_status === 'active').length,
  }

  function tierBadge(tier: string | null) {
    const colors: Record<string, string> = {
      scholar: 'bg-blue-50 text-blue-700 border-blue-200',
      ministry: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      missions: 'bg-amber-50 text-amber-700 border-amber-200',
      free: 'bg-gray-50 text-gray-500 border-gray-200',
    }
    const t = tier || 'free'
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${colors[t] ?? colors.free}`}>
        {t}
      </span>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-bold mb-1">Admin Panel</h1>
      <p className="text-gray-500 text-sm mb-6">Logos by Kai&rsquo;Ros — Pastor Tave only</p>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
            {t.id === 'missions' && pendingMissions.length > 0 && (
              <span className="ml-1.5 inline-block w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-5 text-center">
                {pendingMissions.length}
              </span>
            )}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <>
          {/* Tab 1: Users */}
          {tab === 'users' && (
            <div>
              <input
                type="text"
                placeholder="Search by email or tier…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-80 mb-4 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                      <th className="pb-2 pr-4 font-medium">Email</th>
                      <th className="pb-2 pr-4 font-medium">Tier</th>
                      <th className="pb-2 pr-4 font-medium">Override</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td className="py-2.5 pr-4 text-gray-900">{u.email}</td>
                        <td className="py-2.5 pr-4">{tierBadge(u.subscription_tier)}</td>
                        <td className="py-2.5 pr-4">
                          <select
                            value={u.subscription_tier || 'free'}
                            onChange={async (e) => {
                              const newTier = e.target.value
                              const sb = createSupabaseBrowser()
                              await sb.from('users').update({
                                subscription_tier: newTier,
                                subscription_status: newTier === 'free' ? null : 'active',
                              }).eq('id', u.id)
                              loadData()
                            }}
                            className="text-xs rounded-lg border border-gray-200 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="free">Free</option>
                            <option value="scholar">Scholar</option>
                            <option value="ministry">Ministry</option>
                            <option value="missions">Missions</option>
                          </select>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500">{u.subscription_status ?? '—'}</td>
                        <td className="py-2.5 text-gray-400 text-xs">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-gray-400">{filteredUsers.length} users</p>
            </div>
          )}

          {/* Tab 2: Missions Queue */}
          {tab === 'missions' && (
            <div>
              {pendingMissions.length === 0 ? (
                <p className="text-gray-400 text-sm">No pending applications.</p>
              ) : (
                <div className="space-y-4">
                  {pendingMissions.map((u) => {
                    const app = u.missions_application
                    return (
                      <div key={u.id} className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium text-gray-900">{app?.name ?? u.email}</p>
                            <p className="text-sm text-gray-500">{app?.country ?? '—'}</p>
                            {app?.ministry_context && (
                              <p className="text-sm text-gray-600 mt-2">{app.ministry_context}</p>
                            )}
                            {app?.heard_from && (
                              <p className="text-xs text-gray-400 mt-1">Heard from: {app.heard_from}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              Applied: {app?.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => approveMission(u.id)}
                              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => denyMission(u.id)}
                              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Sponsorships */}
          {tab === 'sponsorships' && (
            <div>
              {sponsorships.length === 0 ? (
                <p className="text-gray-400 text-sm">No sponsorship records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                        <th className="pb-2 pr-4 font-medium">Sponsor</th>
                        <th className="pb-2 pr-4 font-medium">Recipient</th>
                        <th className="pb-2 pr-4 font-medium">Amount</th>
                        <th className="pb-2 pr-4 font-medium">Date</th>
                        <th className="pb-2 font-medium">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sponsorships.map((s) => {
                        const sponsor = users.find((u) => u.id === s.sponsor_id)
                        const recipient = users.find((u) => u.id === s.recipient_id)
                        return (
                          <tr key={s.id}>
                            <td className="py-2.5 pr-4 text-gray-900">{sponsor?.email ?? s.sponsor_id.slice(0, 8)}</td>
                            <td className="py-2.5 pr-4 text-gray-700">{recipient?.email ?? s.recipient_id.slice(0, 8)}</td>
                            <td className="py-2.5 pr-4 text-gray-700">${(s.amount_cents / 100).toFixed(2)}</td>
                            <td className="py-2.5 pr-4 text-gray-400 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                            <td className="py-2.5 text-gray-400 text-xs">{new Date(s.expires_at).toLocaleDateString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Revenue */}
          {tab === 'revenue' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Scholar</p>
                <p className="text-2xl font-bold text-gray-900">{tierCounts.scholar_monthly}</p>
                <p className="text-xs text-gray-400 mt-1">active subscribers</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Ministry</p>
                <p className="text-2xl font-bold text-gray-900">{tierCounts.ministry_monthly}</p>
                <p className="text-xs text-gray-400 mt-1">active subscribers</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Missions</p>
                <p className="text-2xl font-bold text-gray-900">{tierCounts.missions_active}</p>
                <p className="text-xs text-gray-400 mt-1">sponsored accounts</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Sponsorships</p>
                <p className="text-2xl font-bold text-gray-900">{sponsorships.length}</p>
                <p className="text-xs text-gray-400 mt-1">
                  ${sponsorships.reduce((sum, s) => sum + s.amount_cents, 0) / 100} total
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
