'use client'

import { useState, useMemo, useEffect } from 'react'
// All data operations use admin API routes (service role) to bypass RLS

const ADMIN_UUID = '2f4cc459-6fdd-4f41-be4b-754770b28529'

type Tab = 'users' | 'missions' | 'sponsorships' | 'revenue' | 'feedback'
type SortField = 'display_name' | 'subscription_tier' | 'created_at'
type SortDir = 'asc' | 'desc'

interface UserRow {
  id: string
  email: string
  display_name: string | null
  username: string | null
  subscription_tier: string | null
  subscription_status: string | null
  missions_status: string | null
  missions_application: Record<string, string> | null
  country: string | null
  created_at: string
}

// Full credit allocation per tier (for Restore button)
const TIER_CREDIT_ALLOCATION: Record<string, number> = {
  free: 0,
  scholar: 1000,
  ministry: 2100,
  missions: 1000,
}

interface Sponsorship {
  id: string
  sponsor_id: string
  recipient_id: string
  amount_cents: number
  created_at: string
  expires_at: string
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'missions', label: 'Missions' },
  { id: 'sponsorships', label: 'Sponsorships' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'feedback', label: 'Feedback' },
]

const TIERS = ['all', 'free', 'scholar', 'ministry', 'missions'] as const
const PAGE_SIZE = 25

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

function statusBadge(status: string | null) {
  const s = status || 'none'
  const colors: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    past_due: 'bg-red-50 text-red-700',
    canceled: 'bg-gray-100 text-gray-500',
    pending: 'bg-amber-50 text-amber-700',
    pending_approval: 'bg-amber-50 text-amber-700',
    none: 'bg-gray-50 text-gray-400',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${colors[s] ?? colors.none}`}>
      {s === 'pending_approval' ? 'pending' : s}
    </span>
  )
}

export default function AdminTabs({
  initialUsers,
  initialSponsorships,
}: {
  initialUsers: UserRow[]
  initialSponsorships: Sponsorship[]
}) {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState(initialUsers)
  const [sponsorships] = useState(initialSponsorships)
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState<Array<{ id: string; user_name: string; user_email: string; type: string; subject: string; message: string; page_context: string; status: string; admin_notes: string; created_at: string }>>([])
  const [feedbackFilter, setFeedbackFilter] = useState('new')
  // New feedback submissions with AI triage
  const [submissions, setSubmissions] = useState<Array<{
    id: string; user_name: string; user_email: string; page: string; category: string
    message: string; status: string; admin_notes: string; created_at: string
    ai_triage: Array<{ summary: string; suggested_action: string; priority: string }> | null
  }>>([])
  const [submissionFilter, setSubmissionFilter] = useState('new')
  const [userCredits, setUserCredits] = useState<Record<string, number>>({})
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({})

  // Fetch feedback and user credits on mount
  useEffect(() => {
    fetch('/api/admin/feedback').then(r => r.json()).then(d => { if (Array.isArray(d)) setFeedback(d) }).catch(() => {})
    fetch('/api/admin/feedback-submissions').then(r => r.json()).then(d => { if (Array.isArray(d)) setSubmissions(d) }).catch(() => {})
    // Fetch credits for all users in parallel
    async function loadCredits() {
      const results = await Promise.allSettled(
        initialUsers.map(u =>
          fetch(`/api/admin/users/${u.id}/credits`)
            .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
            .then(d => ({ userId: u.id, credits: d.credits_remaining ?? 0 }))
        )
      )
      const creditsMap: Record<string, number> = {}
      for (const r of results) {
        if (r.status === 'fulfilled') creditsMap[r.value.userId] = r.value.credits
      }
      setUserCredits(creditsMap)
    }
    loadCredits()
  }, [initialUsers])
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  async function reloadUsers() {
    // Use admin API route (service role) — NOT browser client which is subject to RLS
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setUsers(data as UserRow[])
    }
    // Reload feedback
    fetch('/api/admin/feedback').then(r => r.json()).then(d => { if (Array.isArray(d)) setFeedback(d) }).catch(() => {})
  }

  // ── Filter, sort, paginate ──
  const filteredUsers = useMemo(() => {
    let list = users
    if (tierFilter !== 'all') {
      list = list.filter((u) => (u.subscription_tier || 'free') === tierFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((u) =>
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.username ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      const av = (a[sortField] ?? '') as string
      const bv = (b[sortField] ?? '') as string
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [users, tierFilter, search, sortField, sortDir])

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE)
  const pagedUsers = filteredUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
    setPage(0)
  }

  function exportCSV() {
    const header = 'Display Name,Username,Email,Tier,Status,Country,Joined'
    const rows = filteredUsers.map((u) =>
      [u.display_name ?? '', u.username ?? '', u.email, u.subscription_tier ?? 'free', u.subscription_status ?? '', u.country ?? '', u.created_at ? new Date(u.created_at).toLocaleDateString() : '']
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logos-users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function updateTier(userId: string, newTier: string) {
    // Optimistic update — update single user in state
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, subscription_tier: newTier, subscription_status: newTier === 'free' ? 'none' : 'active' } : u
    ))
    const res = await fetch(`/api/admin/users/${userId}/tier`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: newTier }),
    })
    if (res.ok) {
      // Confirm with actual DB value from response
      const data = await res.json()
      if (data.subscription_tier && data.subscription_tier !== newTier) {
        // DB value differs from optimistic — sync state
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, subscription_tier: data.subscription_tier } : u
        ))
      }
    } else {
      console.error('Tier update failed:', await res.text())
      reloadUsers() // Revert on failure
    }
  }

  async function addCredits(userId: string) {
    const amount = parseInt(creditInputs[userId] || '0', 10)
    if (!amount || amount <= 0) return
    const res = await fetch(`/api/admin/users/${userId}/credits`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ add_credits: amount }),
    })
    if (res.ok) {
      const d = await res.json()
      setUserCredits(prev => ({ ...prev, [userId]: d.credits_remaining }))
      setCreditInputs(prev => ({ ...prev, [userId]: '' }))
    }
  }

  async function restoreCredits(userId: string) {
    const user = users.find(u => u.id === userId)
    const tier = user?.subscription_tier || 'free'
    const allocation = TIER_CREDIT_ALLOCATION[tier] ?? 0
    const res = await fetch(`/api/admin/users/${userId}/credits`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credits: allocation }),
    })
    if (res.ok) {
      const d = await res.json()
      setUserCredits(prev => ({ ...prev, [userId]: d.credits_remaining }))
    }
  }

  async function approveMission(userId: string) {
    // Use tier API (service role) — browser client is blocked by RLS
    await fetch(`/api/admin/users/${userId}/tier`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'missions', missions_status: 'active' }),
    })
    reloadUsers()
  }

  async function denyMission(userId: string) {
    await fetch(`/api/admin/users/${userId}/tier`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'free', missions_status: 'none' }),
    })
    reloadUsers()
  }

  const missionUsers = users.filter((u) =>
    ['pending_approval', 'pending_sponsor', 'active'].includes(u.missions_status ?? '')
  )
  const pendingCount = missionUsers.filter((u) => u.missions_status === 'pending_approval').length

  const activeUsers = users.filter((u) => u.subscription_status === 'active')
  const scholarCount = activeUsers.filter((u) => u.subscription_tier === 'scholar').length
  const ministryCount = activeUsers.filter((u) => u.subscription_tier === 'ministry').length
  const missionsCount = activeUsers.filter((u) => u.subscription_tier === 'missions').length
  const freeCount = users.filter((u) => !u.subscription_tier || u.subscription_tier === 'free').length
  const estimatedMRR = scholarCount * 9.99 + ministryCount * 29.99

  return (
    <>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setPage(0) }}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? 'text-emerald-700' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
            {t.id === 'missions' && pendingCount > 0 && (
              <span className="ml-1.5 inline-block w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-5 text-center">
                {pendingCount}
              </span>
            )}
            {t.id === 'feedback' && (submissions.filter(s => s.status !== 'resolved').length + feedback.filter(f => f.status === 'new').length) > 0 && (
              <span className="ml-1.5 inline-block w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-5 text-center">
                {submissions.filter(s => s.status !== 'resolved').length + feedback.filter(f => f.status === 'new').length}
              </span>
            )}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: USERS ── */}
      {tab === 'users' && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              type="text"
              placeholder="Search name, username, email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="w-full sm:w-64 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value); setPage(0) }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>{t === 'all' ? 'All Tiers' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
            <button onClick={exportCSV} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Export CSV
            </button>
            <span className="text-xs text-gray-400 ml-auto">{filteredUsers.length} users</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-3 font-medium cursor-pointer hover:text-gray-600" onClick={() => toggleSort('display_name')}>
                    Name {sortField === 'display_name' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="pb-2 pr-3 font-medium">Username</th>
                  <th className="pb-2 pr-3 font-medium">Email</th>
                  <th className="pb-2 pr-3 font-medium cursor-pointer hover:text-gray-600" onClick={() => toggleSort('subscription_tier')}>
                    Tier {sortField === 'subscription_tier' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Country</th>
                  <th className="pb-2 pr-3 font-medium cursor-pointer hover:text-gray-600" onClick={() => toggleSort('created_at')}>
                    Joined {sortField === 'created_at' && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="pb-2 pr-3 font-medium">Credits</th>
                  <th className="pb-2 font-medium">Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-3 text-gray-900 font-medium">{u.display_name ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-gray-500 text-xs">{u.username ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-gray-700">{u.email}</td>
                    <td className="py-2.5 pr-3">{tierBadge(u.subscription_tier)}</td>
                    <td className="py-2.5 pr-3">{statusBadge(u.subscription_status)}</td>
                    <td className="py-2.5 pr-3 text-gray-500 text-xs">{u.country ?? '—'}</td>
                    <td className="py-2.5 pr-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-gray-700 min-w-[3rem]">
                          {u.id === ADMIN_UUID ? '∞' : (userCredits[u.id] != null ? Math.round(userCredits[u.id]) : '—')}
                        </span>
                        {u.id !== ADMIN_UUID && (
                          <>
                            <input
                              type="number"
                              min="1"
                              placeholder="+"
                              value={creditInputs[u.id] || ''}
                              onChange={(e) => setCreditInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') addCredits(u.id) }}
                              className="w-14 text-xs rounded border border-gray-200 px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <button
                              onClick={() => addCredits(u.id)}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => restoreCredits(u.id)}
                              title={`Restore to ${u.subscription_tier || 'free'} tier allocation: ${TIER_CREDIT_ALLOCATION[u.subscription_tier || 'free'] ?? 0} credits`}
                              className="px-2 py-1 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            >
                              Restore
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <select
                          value={u.subscription_tier || 'free'}
                          onChange={(e) => updateTier(u.id, e.target.value)}
                          className="text-xs rounded-lg border border-gray-200 px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="free">Free</option>
                          <option value="scholar">Scholar</option>
                          <option value="ministry">Ministry</option>
                          <option value="missions">Missions</option>
                        </select>
                        {u.id === ADMIN_UUID && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">ADMIN</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                &larr; Prev
              </button>
              <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: MISSIONS ── */}
      {tab === 'missions' && (
        <div>
          {missionUsers.length === 0 ? (
            <p className="text-gray-400 text-sm">No missions applications.</p>
          ) : (
            <div className="space-y-4">
              {missionUsers.map((u) => {
                const app = u.missions_application
                const sponsor = u.missions_status === 'active'
                  ? users.find((s) => s.id === (app as Record<string, string>)?.sponsored_by)
                  : null
                return (
                  <div key={u.id} className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900">{app?.name ?? u.display_name ?? u.email}</p>
                          {statusBadge(u.missions_status)}
                        </div>
                        <p className="text-sm text-gray-500">{u.email}</p>
                        {(app?.country || u.country) && (
                          <p className="text-sm text-gray-500">{app?.country ?? u.country}</p>
                        )}
                        {app?.ministry_context && (
                          <p className="text-sm text-gray-600 mt-2">{app.ministry_context}</p>
                        )}
                        {app?.heard_from && (
                          <p className="text-xs text-gray-400 mt-1">Heard from: {app.heard_from}</p>
                        )}
                        {app?.applied_at && (
                          <p className="text-xs text-gray-400 mt-1">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                        )}
                        {sponsor && (
                          <p className="text-xs text-emerald-600 mt-1">Sponsored by: {sponsor.email}</p>
                        )}
                      </div>
                      {u.missions_status === 'pending_approval' && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => approveMission(u.id)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">Approve</button>
                          <button onClick={() => denyMission(u.id)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors">Deny</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SPONSORSHIPS ── */}
      {tab === 'sponsorships' && (
        <div>
          {sponsorships.length === 0 ? (
            <p className="text-gray-400 text-sm">No sponsorship records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                    <th className="pb-2 pr-4 font-medium">Recipient</th>
                    <th className="pb-2 pr-4 font-medium">Sponsor</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Activated</th>
                    <th className="pb-2 font-medium">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sponsorships.map((s) => {
                    const sponsor = users.find((u) => u.id === s.sponsor_id)
                    const recipient = users.find((u) => u.id === s.recipient_id)
                    const expired = new Date(s.expires_at) < new Date()
                    return (
                      <tr key={s.id}>
                        <td className="py-2.5 pr-4 text-gray-900">{recipient?.display_name ?? recipient?.email ?? s.recipient_id.slice(0, 8)}</td>
                        <td className="py-2.5 pr-4 text-gray-700">{sponsor?.display_name ?? sponsor?.email ?? s.sponsor_id.slice(0, 8)}</td>
                        <td className="py-2.5 pr-4 text-gray-700">${(s.amount_cents / 100).toFixed(2)}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${expired ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                            {expired ? 'expired' : 'active'}
                          </span>
                        </td>
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

      {/* ── TAB 4: REVENUE ── */}
      {tab === 'revenue' && (
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Free</p>
              <p className="text-2xl font-bold text-gray-900">{freeCount}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Scholar</p>
              <p className="text-2xl font-bold text-gray-900">{scholarCount}</p>
              <p className="text-xs text-gray-400 mt-1">active</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">Ministry</p>
              <p className="text-2xl font-bold text-gray-900">{ministryCount}</p>
              <p className="text-xs text-gray-400 mt-1">active</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5">
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">Missions</p>
              <p className="text-2xl font-bold text-gray-900">{missionsCount}</p>
              <p className="text-xs text-gray-400 mt-1">sponsored accounts</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Sponsorships</p>
              <p className="text-2xl font-bold text-gray-900">{sponsorships.length}</p>
              <p className="text-xs text-gray-400 mt-1">${(sponsorships.reduce((sum, s) => sum + s.amount_cents, 0) / 100).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-5">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Estimated MRR</p>
              <p className="text-2xl font-bold text-gray-900">${estimatedMRR.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">Scholar × $9.99 + Ministry × $29.99</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: FEEDBACK ── */}
      {tab === 'feedback' && (
        <div>
          {/* New submissions (Make Us Better) */}
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Make Us Better Submissions</h3>
          <div className="flex gap-2 mb-4 flex-wrap">
            {['all', 'new', 'reviewed', 'resolved'].map((f) => (
              <button key={f} onClick={() => setSubmissionFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${submissionFilter === f ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== 'all' && (() => { const c = submissions.filter(s => s.status === f).length; return c > 0 ? ` (${c})` : '' })()}
              </button>
            ))}
          </div>
          {submissions.filter(s => submissionFilter === 'all' || s.status === submissionFilter).length === 0 ? (
            <p className="text-gray-400 text-sm mb-8">No submissions matching this filter.</p>
          ) : (
            <div className="space-y-3 mb-8">
              {submissions.filter(s => submissionFilter === 'all' || s.status === submissionFilter).map((s) => {
                const catColors: Record<string, string> = { bug: 'bg-red-50 text-red-700', suggestion: 'bg-blue-50 text-blue-700', content: 'bg-gray-100 text-gray-600', praise: 'bg-amber-50 text-amber-700' }
                const priColors: Record<string, string> = { critical: 'bg-red-100 text-red-800 border-red-300', high: 'bg-orange-50 text-orange-700 border-orange-200', medium: 'bg-yellow-50 text-yellow-700 border-yellow-200', low: 'bg-green-50 text-green-700 border-green-200' }
                const triage = s.ai_triage?.[0]
                const ago = Math.round((Date.now() - new Date(s.created_at).getTime()) / 3600000)
                return (
                  <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${catColors[s.category] ?? catColors.content}`}>{s.category}</span>
                        {triage?.priority && (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${priColors[triage.priority] ?? priColors.medium}`}>{triage.priority.toUpperCase()}</span>
                        )}
                        <span className="text-xs text-gray-400">{s.user_name || s.user_email}</span>
                      </div>
                      <select
                        value={s.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value
                          setSubmissions(prev => prev.map(x => x.id === s.id ? { ...x, status: newStatus } : x))
                          await fetch(`/api/admin/feedback-submissions/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
                        }}
                        className="text-xs rounded border border-gray-200 px-2 py-1 bg-white"
                      >
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                    {triage && (
                      <div className="mb-2 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100">
                        <p className="text-xs font-medium text-blue-800 mb-0.5">AI Summary</p>
                        <p className="text-sm text-blue-900">{triage.summary}</p>
                        {triage.suggested_action && (
                          <p className="text-xs text-blue-700 mt-1"><strong>Action:</strong> {triage.suggested_action}</p>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.message}</p>
                    {s.page && <p className="text-xs text-gray-400 mt-1">Page: {s.page}</p>}
                    <p className="text-xs text-gray-400 mt-1">{ago < 1 ? 'Just now' : ago < 24 ? `${ago}h ago` : `${Math.round(ago / 24)}d ago`}</p>
                    <textarea
                      placeholder="Add internal notes..."
                      defaultValue={s.admin_notes ?? ''}
                      onBlur={async (e) => {
                        await fetch(`/api/admin/feedback-submissions/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_notes: e.target.value }) })
                      }}
                      className="mt-2 w-full text-xs border border-gray-100 rounded px-2 py-1.5 bg-gray-50 resize-none"
                      rows={2}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Legacy feedback (from /contact page) */}
          {feedback.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 pt-4 border-t border-gray-100">Contact Page Feedback (Legacy)</h3>
              <div className="flex gap-2 mb-4 flex-wrap">
                {['all', 'new', 'reviewing', 'resolved', 'dismissed'].map((f) => (
                  <button key={f} onClick={() => setFeedbackFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${feedbackFilter === f ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                ))}
              </div>
              <div className="space-y-3">
                {feedback.filter(f => feedbackFilter === 'all' || f.status === feedbackFilter).map((f) => {
                  const typeColors: Record<string, string> = { bug: 'bg-red-50 text-red-700', feature: 'bg-blue-50 text-blue-700', general: 'bg-gray-100 text-gray-600', praise: 'bg-amber-50 text-amber-700' }
                  const ago = Math.round((Date.now() - new Date(f.created_at).getTime()) / 3600000)
                  return (
                    <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${typeColors[f.type] ?? typeColors.general}`}>{f.type}</span>
                          <span className="ml-2 text-xs text-gray-400">{f.user_name} ({f.user_email})</span>
                        </div>
                        <select
                          value={f.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value
                            setFeedback(prev => prev.map(x => x.id === f.id ? { ...x, status: newStatus } : x))
                            await fetch(`/api/admin/feedback/${f.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
                          }}
                          className="text-xs rounded border border-gray-200 px-2 py-1 bg-white"
                        >
                          <option value="new">New</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="resolved">Resolved</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">{f.subject}</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{f.message}</p>
                      {f.page_context && <p className="text-xs text-gray-400 mt-1">Page: {f.page_context}</p>}
                      <p className="text-xs text-gray-400 mt-1">{ago < 1 ? 'Just now' : ago < 24 ? `${ago}h ago` : `${Math.round(ago / 24)}d ago`}</p>
                      <textarea
                        placeholder="Add internal notes..."
                        defaultValue={f.admin_notes ?? ''}
                        onBlur={async (e) => {
                          await fetch(`/api/admin/feedback/${f.id}/notes`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: e.target.value }) })
                        }}
                        className="mt-2 w-full text-xs border border-gray-100 rounded px-2 py-1.5 bg-gray-50 resize-none"
                        rows={2}
                      />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
