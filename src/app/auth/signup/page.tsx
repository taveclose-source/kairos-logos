'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    const supabase = createSupabaseBrowser()

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() || null },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Insert into users table via API (service role bypasses RLS)
    if (data.user) {
      await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.user.id,
          email: email.trim(),
          display_name: displayName.trim() || email.trim().split('@')[0],
        }),
      }).catch(() => {})
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-bold tracking-tight">Logos</h1>
              <p className="text-xs text-gray-400 tracking-wide">by Kai&apos;Ros</p>
            </Link>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-6">
            <h2 className="text-lg font-semibold text-emerald-800 mb-2">Check your email</h2>
            <p className="text-sm text-emerald-700">
              We sent a confirmation link to <strong>{email}</strong>.
              Click it to activate your account.
            </p>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            <Link href="/auth/signin" className="text-gray-900 font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold tracking-tight">Logos</h1>
            <p className="text-xs text-gray-400 tracking-wide">by Kai&apos;Ros</p>
          </Link>
        </div>

        <h2 className="text-lg font-semibold text-center mb-6">Create account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name (optional)"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 characters)"
            required
            minLength={6}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-gray-900 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
