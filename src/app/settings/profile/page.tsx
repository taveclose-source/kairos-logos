'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function ProfileSettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('')
  const [stateRegion, setStateRegion] = useState('')
  const [city, setCity] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/auth/signin?redirect=/settings/profile')
        return
      }
      setUserId(user.id)
      setUserEmail(user.email ?? '')
      const { data } = await supabase
        .from('users')
        .select('display_name, username, full_name, country, state_region, city')
        .eq('id', user.id)
        .single()
      if (data) {
        setDisplayName(data.display_name ?? '')
        setUsername(data.username ?? '')
        setFullName(data.full_name ?? '')
        setCountry(data.country ?? '')
        setStateRegion(data.state_region ?? '')
        setCity(data.city ?? '')
      }
      setLoading(false)
    })
  }, [router])

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const supabase = createSupabaseBrowser()

    // Validate username uniqueness if changed
    if (username.trim()) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.trim())
        .neq('id', userId)
        .maybeSingle()
      if (existing) {
        setError('That username is already taken.')
        setSaving(false)
        return
      }
    }

    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: userEmail,
        display_name: displayName.trim() || null,
        username: username.trim() || null,
        full_name: fullName.trim() || null,
        country: country.trim() || null,
        state_region: stateRegion.trim() || null,
        city: city.trim() || null,
      }, { onConflict: 'id' })

    if (dbError) {
      setError('Failed to save. Please try again.')
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-16">
        <p className="text-sm text-gray-400 text-center">Loading…</p>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-bold mb-1">Profile Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Update your display name and username</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you appear on the platform"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <p className="text-xs text-gray-400 mt-1">Shown as &ldquo;Welcome, ___&rdquo; on your dashboard</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
            placeholder="your-handle"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, dots, hyphens, underscores</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your real name"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. Ghana, United States"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State / Region
            </label>
            <input
              type="text"
              value={stateRegion}
              onChange={(e) => setStateRegion(e.target.value)}
              placeholder="e.g. Ashanti, Florida"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Kumasi, Sarasota"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Profile updated.</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </main>
  )
}
