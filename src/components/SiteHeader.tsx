'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
// Image import removed — using plain img for SVG
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import { useLanguage, BPS_LANGUAGES } from '@/context/LanguageContext'
import type { User } from '@supabase/supabase-js'

const NAV_LINKS = [
  { href: '/bible', label: 'Bible' },
  { href: '/ask', label: 'Ask' },
  { href: '/why-kjv', label: 'Why KJV?' },
  { href: '/learn', label: 'Learn' },
  { href: '/translation', label: 'Translation' },
]

function LanguageSelector() {
  const { languageCode, languageName, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        aria-label="Select companion language"
      >
        <span className="text-[10px] text-gray-400 uppercase tracking-wide hidden sm:inline">Companion:</span>
        <span className="font-medium">{languageName}</span>
        <svg className="w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 w-56 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Companion Language
              </p>
              <p className="text-[10px] text-gray-400">
                BPS-approved editions &middot; {BPS_LANGUAGES.length} languages
              </p>
            </div>
            {BPS_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  if (lang.active) {
                    setLanguage(lang.code)
                    setOpen(false)
                  }
                }}
                disabled={!lang.active}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                  lang.active
                    ? lang.code === languageCode
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'hover:bg-gray-50 text-gray-700'
                    : 'text-gray-300 cursor-default'
                }`}
              >
                <span>{lang.name}</span>
                {lang.active && lang.code === languageCode && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
                {!lang.active && (
                  <span className="text-[10px] text-gray-300 italic">Coming soon</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function SiteHeader() {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const ADMIN_ID = '2f4cc459-6fdd-4f41-be4b-754770b28529'
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setIsAdmin(data.user?.id === ADMIN_ID)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsAdmin(session?.user?.id === ADMIN_ID)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close mobile menu on navigation
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  async function handleSignOut() {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  // Don't show header on auth pages
  if (pathname.startsWith('/auth')) return null

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Wordmark */}
        <Link href="/" className="shrink-0">
          <img src="/logos-brand.svg" alt="Logos by Kai'Ros" width="140" height="40" style={{display:'block'}} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith(link.href)
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Language selector + Auth + mobile toggle */}
        <div className="flex items-center gap-2">
          <LanguageSelector />

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings/profile"
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Profile
                </Link>
                <span className="text-xs text-gray-400 max-w-[160px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 -mr-2 text-gray-500 hover:text-gray-900"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 pt-3 border-t border-gray-100">
            {user ? (
              <div className="space-y-2">
                <div className="flex gap-2 px-3">
                  <Link
                    href="/dashboard"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/settings/profile"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      Admin
                    </Link>
                  )}
                </div>
                <div className="flex items-center justify-between px-3">
                  <span className="text-xs text-gray-400 truncate">{user.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                Sign in / Create account
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
