'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  display_name: string | null
  last_read_book: string | null
  last_read_chapter: number | null
  subscription_tier: string | null
}

interface QueueItem {
  id: string
  question: string
  status: string
  submitted_at: string
  ai_draft: string | null
  approved_answer: string | null
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [questions, setQuestions] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowser()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/auth/signin?redirect=/dashboard')
        return
      }
      setUser(user)

      const [profileRes, questionsRes] = await Promise.all([
        supabase
          .from('users')
          .select('display_name, last_read_book, last_read_chapter, subscription_tier')
          .eq('id', user.id)
          .single(),
        supabase
          .from('theological_queue')
          .select('id, question, status, submitted_at, ai_draft, approved_answer')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false }),
      ])

      setProfile(profileRes.data)
      setQuestions(questionsRes.data ?? [])
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-sm text-gray-400 text-center">Loading...</p>
      </main>
    )
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Reader'
  const tier = profile?.subscription_tier || 'free'
  const pendingCount = questions.filter((q) => q.status === 'pending').length
  const answeredCount = questions.filter((q) => q.status === 'approved').length

  const tierLabels: Record<string, string> = {
    free: 'Free',
    scholar: 'Scholar',
    ministry: 'Ministry',
    missions: 'Missions',
  }
  const tierColors: Record<string, string> = {
    free: 'bg-gray-50 text-gray-600 border-gray-200',
    scholar: 'bg-blue-50 text-blue-700 border-blue-200',
    ministry: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    missions: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl sm:text-4xl font-bold">
          Welcome, {displayName}
        </h1>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${tierColors[tier] ?? tierColors.free}`}>
          {tierLabels[tier] ?? 'Free'}
        </span>
      </div>
      <p className="text-gray-500 mb-8">Your study companion</p>

      {/* Upgrade prompt for free tier */}
      {tier === 'free' && (
        <Link
          href="/pricing"
          className="block rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 mb-6 hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">
            Upgrade
          </p>
          <p className="text-sm text-gray-700">
            Unlock unlimited questions, voice playback, and Pastor&apos;s Helps.{' '}
            <span className="text-emerald-700 font-medium group-hover:text-emerald-800">See plans &rarr;</span>
          </p>
        </Link>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link
          href="/bible"
          className="block rounded-xl border border-gray-200 p-5 hover:border-gray-400 hover:shadow-md transition-all"
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Read</p>
          <p className="text-lg font-semibold text-gray-900">Open the Bible &rarr;</p>
        </Link>
        <Link
          href="/ask"
          className="block rounded-xl border border-gray-200 p-5 hover:border-gray-400 hover:shadow-md transition-all"
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Study</p>
          <p className="text-lg font-semibold text-gray-900">Ask the Word &rarr;</p>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Questions</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{answeredCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Answered</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Pending</p>
        </div>
      </div>

      {/* Questions */}
      <h2 className="text-lg font-semibold mb-4">Your Questions</h2>

      {questions.length === 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-400 mb-3">No questions yet.</p>
          <Link
            href="/ask"
            className="inline-block px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Ask the Word
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 flex items-center justify-between border-b border-gray-100">
              <StatusBadge status={q.status} />
              <span className="text-xs text-gray-400">
                {new Date(q.submitted_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-gray-800 font-medium">{q.question}</p>
            </div>

            {q.status === 'approved' && q.approved_answer && (
              <div className="px-5 pb-4">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">
                    Pastoral Answer
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {q.approved_answer}
                  </p>
                </div>
              </div>
            )}

            {q.status === 'pending' && (
              <div className="px-5 pb-4">
                <p className="text-xs text-amber-600 italic">
                  Under pastoral review — you&apos;ll see the answer here when it&apos;s approved.
                </p>
              </div>
            )}

            {q.status === 'rejected' && (
              <div className="px-5 pb-4">
                <p className="text-xs text-gray-400 italic">
                  This question was reviewed and closed.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-12 text-xs text-gray-400 text-center">
        Logos by Kai&apos;Ros &middot; Your study, His Word
      </p>
    </main>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-gray-100 text-gray-500',
  }

  const labels: Record<string, string> = {
    pending: 'Pending review',
    approved: 'Answered',
    rejected: 'Closed',
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {labels[status] || status}
    </span>
  )
}
