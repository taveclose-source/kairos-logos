'use client'

import { useState, useMemo } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

const ADMIN_UUID = '2f4cc459-6fdd-4f41-be4b-754770b28529'

type Tab = 'users' | 'missions' | 'sponsorships' | 'revenue'
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
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  async function reloadUsers() {
    const sb = createSupabaseBrowser()
    const { data } = await sb
      .from('users')
      .select('id, email, display_name, username, subscription_tier, subscription_status, missions_status, missions_application, country, created_at')
      .order('created_at', { ascending: false })
    if (data) setUsers(data as UserRow[])
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
    const res = await fetch(`/api/admin/users/${userId}/tier`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: newTier }),
    })
    if (res.ok) reloadUsers()
    else console.error('Tier update failed:', await res.text())
  }

  async function approveMission(userId: string) {
    const sb = createSupabaseBrowser()
    await sb.from('users').update({
      missions_status: 'active',
      subscription_tier: 'missions',
      subscription_status: 'active',
    }).eq('id', userId)
    reloadUsers()
  }

  async function denyMission(userId: string) {
    const sb = createSupabaseBrowser()
    await sb.from('users').update({ missions_status: 'none' }).eq('id', userId)
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
    </>
  )
}
