'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
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
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [memoryCredits, setMemoryCredits] = useState(0)
  useTheme() // theme-aware via CSS vars
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/signin?redirect=/dashboard'); return }
      setUser(user)
      const [profileRes, questionsRes] = await Promise.all([
        supabase.from('users').select('display_name, last_read_book, last_read_chapter, subscription_tier').eq('id', user.id).single(),
        supabase.from('theological_queue').select('id, question, status, submitted_at, ai_draft, approved_answer').eq('user_id', user.id).order('submitted_at', { ascending: false }),
      ])
      setProfile(profileRes.data)
      setQuestions(questionsRes.data ?? [])
      // Fetch memory status
      fetch('/api/memory').then(r => r.json()).then(m => {
        setMemoryEnabled(m.memory_enabled)
        setMemoryCredits(m.credits_remaining)
      }).catch(() => {})
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <main style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 56px)' }} className="flex items-center justify-center">
        <p style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: '13px' }}>Loading...</p>
      </main>
    )
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Reader'
  const tier = profile?.subscription_tier || 'free'
  const pendingCount = questions.filter((q) => q.status === 'pending').length
  const answeredCount = questions.filter((q) => q.status === 'approved').length

  const tierBadgeColors: Record<string, string> = {
    free: 'border-[var(--border-medium)] color-[var(--text-secondary)]',
    scholar: 'border-blue-700 text-blue-400',
    ministry: 'border-emerald-700 text-emerald-400',
    missions: 'border-amber-700 text-amber-400',
  }

  return (
    <main style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 56px)' }} className="px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '28px', letterSpacing: '2px' }}>
            Welcome, {displayName}
          </h1>
          <span className={`inline-block px-3 py-1 rounded text-[10px] font-medium uppercase tracking-[2px] border ${tierBadgeColors[tier] ?? tierBadgeColors.free}`} style={{ fontFamily: 'var(--font-ui)' }}>
            {tier}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontSize: '13px', marginBottom: '2rem' }}>Your study companion</p>

        {tier === 'free' && (
          <Link href="/pricing" className="block mb-6 transition-all duration-200 hover:border-[var(--gold)]" style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '1.25rem', background: 'var(--bg-secondary)' }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.25rem' }}>Upgrade</p>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Unlock unlimited questions, voice playback, and Pastor&apos;s Helps. <span style={{ color: 'var(--gold)' }}>See plans &rarr;</span>
            </p>
          </Link>
        )}

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/bible" className="block transition-all duration-200 hover:border-[var(--border-medium)]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Read</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--text-primary)' }}>Open the Bible &rarr;</p>
          </Link>
          <Link href="/study" className="block transition-all duration-200 hover:border-[var(--border-medium)]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '1.25rem' }}>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Study</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--text-primary)' }}>Ask the Word &rarr;</p>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { n: questions.length, label: 'Questions', color: questions.length > 0 ? 'var(--gold)' : 'var(--text-secondary)' },
            { n: answeredCount, label: 'Answered', color: answeredCount > 0 ? 'var(--emerald)' : 'var(--text-secondary)' },
            { n: pendingCount, label: 'Pending', color: pendingCount > 0 ? 'var(--gold)' : 'var(--text-secondary)' },
          ].map((s) => (
            <div key={s.label} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', fontWeight: 700, color: s.color, fontFamily: 'var(--font-ui)' }}>{s.n}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '0.25rem' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Memory status card */}
        <a href={tier === 'free' ? '/pricing' : '/settings/memory'} className="block mb-8 transition-all duration-200" style={{ background: 'var(--bg-secondary)', border: memoryEnabled ? '1px solid var(--gold)' : '1px solid var(--border-subtle)', borderRadius: 4, padding: '1rem 1.25rem', textDecoration: 'none' }}>
          {tier === 'free' ? (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>Upgrade to Scholar to enable Logos Memory</p>
          ) : !memoryEnabled ? (
            <>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--gold)' }}>Enable Memory — Logos remembers your study context</p>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>Get Started &rarr;</p>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--gold)' }}>⚡ {memoryCredits} credits remaining</p>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-tertiary)' }}>Manage &rarr;</span>
            </div>
          )}
        </a>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '2px', color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '1rem' }}>Your Questions</h2>

        {questions.length === 0 && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font-ui)', marginBottom: '0.75rem' }}>No questions yet.</p>
            <Link href="/study">
              <span className="inline-block transition-colors duration-200 hover:opacity-90" style={{ background: 'var(--gold)', color: 'var(--bg-primary)', padding: '10px 24px', fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', borderRadius: '2px' }}>
                Ask the Word
              </span>
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <StatusBadge status={q.status} />
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)' }}>
                  {new Date(q.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="px-5 py-4">
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>{q.question}</p>
              </div>
              {q.status === 'approved' && q.approved_answer && (
                <div className="px-5 pb-4">
                  <div style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: '4px', padding: '0.75rem 1rem' }}>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--emerald)', marginBottom: '0.25rem' }}>Pastoral Answer</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{q.approved_answer}</p>
                  </div>
                </div>
              )}
              {q.status === 'pending' && (
                <div className="px-5 pb-4">
                  <p style={{ fontSize: '12px', color: 'var(--gold)', fontStyle: 'italic', fontFamily: 'var(--font-body)' }}>
                    Under pastoral review — you&apos;ll see the answer here when it&apos;s approved.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="mt-12 text-center" style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', letterSpacing: '2px' }}>
          LOGOS BY KAI&apos;ROS &middot; YOUR STUDY, HIS WORD
        </p>
      </div>
    </main>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'rgba(200,169,110,0.15)',
    approved: 'rgba(29,158,117,0.15)',
    rejected: 'rgba(85,85,80,0.15)',
  }
  const textColors: Record<string, string> = {
    pending: 'var(--gold)',
    approved: 'var(--emerald)',
    rejected: 'var(--text-tertiary)',
  }
  const labels: Record<string, string> = {
    pending: 'Pending review',
    approved: 'Answered',
    rejected: 'Closed',
  }
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '2px', fontSize: '10px', fontFamily: 'var(--font-ui)', letterSpacing: '1px', textTransform: 'uppercase', background: colors[status] ?? colors.rejected, color: textColors[status] ?? textColors.rejected }}>
      {labels[status] || status}
    </span>
  )
}
