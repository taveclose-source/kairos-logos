'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import CreditPurchaseModal from '@/components/CreditPurchaseModal'
// Theme handled by CSS variables

export default function MemorySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [credits, setCredits] = useState(0)
  const [memoryData, setMemoryData] = useState<Record<string, unknown>>({})
  const [showPurchase, setShowPurchase] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const sb = createSupabaseBrowser()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/signin?redirect=/settings/memory'); return }
      fetch('/api/memory').then(r => r.json()).then(data => {
        setMemoryEnabled(data.memory_enabled)
        setCredits(data.credits_remaining)
        setMemoryData(data.memory_data ?? {})
        setLoading(false)
      })
    })
  }, [router])

  async function toggleMemory() {
    const newState = !memoryEnabled
    setMemoryEnabled(newState)
    await fetch('/api/memory/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newState }),
    })
  }

  async function clearMemory() {
    if (!confirm('Clear all study memory? This cannot be undone.')) return
    await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory_update: {} }),
    })
    setMemoryData({})
  }

  if (loading) return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>Loading...</p></main>

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div className="max-w-lg mx-auto">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', marginBottom: 4 }}>Study Memory</h1>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: '2rem' }}>Manage your persistent Bible study memory</p>

        {/* Memory toggle */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>Memory</p>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--text-secondary)' }}>{memoryEnabled ? 'Active — Logos remembers your study context' : 'Paused — enable to resume'}</p>
            </div>
            <button onClick={toggleMemory} style={{ padding: '6px 16px', borderRadius: 3, border: '1px solid var(--border-medium)', background: memoryEnabled ? 'var(--gold)' : 'transparent', color: memoryEnabled ? '#2C1810' : 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '1px', cursor: 'pointer' }}>
              {memoryEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Credits */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>Credits Remaining</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold)' }}>{credits}</p>
          <button onClick={() => setShowPurchase(true)} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 3, background: 'var(--gold)', color: '#2C1810', fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
            Add Credits
          </button>
        </div>

        {/* Memory preview */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 }}>Your Study Memory</p>
          {Object.keys(memoryData).length === 0 ? (
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>No memory data yet. Start asking questions with memory enabled.</p>
          ) : (
            <>
              {memoryData.books_studied && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>Books: {(memoryData.books_studied as string[]).join(', ')}</p>}
              {memoryData.topics_explored && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>Topics: {(memoryData.topics_explored as string[]).join(', ')}</p>}
              {memoryData.last_updated && <p style={{ fontFamily: 'var(--font-ui)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>Last updated: {memoryData.last_updated as string}</p>}
            </>
          )}
          <button onClick={clearMemory} style={{ marginTop: 8, fontFamily: 'var(--font-ui)', fontSize: 10, letterSpacing: '1px', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Clear Memory
          </button>
        </div>
      </div>

      {showPurchase && <CreditPurchaseModal onClose={() => setShowPurchase(false)} />}
    </main>
  )
}
