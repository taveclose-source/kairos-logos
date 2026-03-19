'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'

const ADMIN_ID = '2f4cc459-6fdd-4f41-be4b-754770b28529'

const CENTER_LINKS = [
  { href: '/bible', label: 'Bible' },
  { href: '/ask', label: 'Ask' },
  { href: '/why-kjv', label: 'Why KJV?' },
  { href: '/translation', label: 'Translation' },
]

export default function SiteHeader() {
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      setIsAdmin(data.user?.id === ADMIN_ID)
      if (data.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', data.user.id)
          .single()
        setDisplayName(profile?.display_name ?? '')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsAdmin(session?.user?.id === ADMIN_ID)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  async function handleSignOut() {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  if (pathname.startsWith('/auth') || pathname === '/') return null

  const navLinkStyle = (href: string) =>
    `transition-colors duration-200 ${
      pathname.startsWith(href)
        ? 'text-[#FFD060]'
        : 'text-[rgba(255,208,64,0.9)] hover:text-[#FFFFFF]'
    }`

  const navLinkClass = 'font-[var(--font-ui)] text-[13px] tracking-[2px] uppercase'

  const avatarLetter = (displayName || user?.email || '?')[0].toUpperCase()

  return (
    <header
      className="sticky top-0 z-50 relative"
      style={{
        background: 'var(--bg-primary)',
        borderBottom: '1px solid rgba(0,0,0,0.25)',
        boxShadow: '0 1px 0 rgba(200,169,110,0.15)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 md:h-[56px]">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '4px' }}>LOGOS</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', fontStyle: 'italic', color: 'var(--gold)', letterSpacing: '3px', marginTop: '2px' }}>by Kai&apos;Ros</span>
          </div>
        </Link>

        {/* Center nav — desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {CENTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`${navLinkClass} ${navLinkStyle(link.href)}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link href="/learn" className={`${navLinkClass} ${navLinkStyle('/learn')}`}>
                Learn
              </Link>
              {isAdmin && (
                <Link href="/admin" className={`${navLinkClass} text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors duration-200`}>
                  Admin
                </Link>
              )}
              <Link href="/settings/profile" title="Profile">
                <div
                  className="flex items-center justify-center rounded-full transition-colors duration-200"
                  style={{
                    width: 28, height: 28,
                    background: 'var(--gold-muted)',
                    color: 'var(--gold-light)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {avatarLetter}
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                className={`${navLinkClass} text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200`}
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link href="/auth/signin">
              <span
                className="inline-block transition-colors duration-200 hover:bg-[#F5C878] hover:text-[#6B3515]"
                style={{
                  border: '1px solid #F5C878',
                  color: '#F5C878',
                  padding: '6px 16px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  background: 'transparent',
                  borderRadius: '2px',
                }}
              >
                Sign In
              </span>
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 -mr-2"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="var(--gold)" strokeWidth={1.5}>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMenuOpen(false)} />
          <div
            className="fixed top-0 right-0 bottom-0 z-50 w-64 md:hidden flex flex-col"
            style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-subtle)' }}
          >
            <div className="flex justify-end p-4">
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="var(--gold)" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-4">
              {CENTER_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className={`py-2 ${navLinkClass} ${navLinkStyle(link.href)}`}>
                  {link.label}
                </Link>
              ))}
              <Link href="/learn" className={`py-2 ${navLinkClass} ${navLinkStyle('/learn')}`}>
                Learn
              </Link>
            </nav>
            <div className="mt-auto px-4 pb-6" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link href="/dashboard" className={`${navLinkClass} text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1`}>Dashboard</Link>
                  <Link href="/settings/profile" className={`${navLinkClass} text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1`}>Profile</Link>
                  {isAdmin && (
                    <Link href="/admin" className={`${navLinkClass} text-[var(--gold)] py-1`}>Admin</Link>
                  )}
                  <button onClick={handleSignOut} className={`${navLinkClass} text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1 text-left`}>
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link href="/auth/signin" className={`${navLinkClass} text-[var(--gold)] py-1`}>
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  )
}
