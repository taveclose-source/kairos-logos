'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/home', label: 'Home', icon: '⌂' },
  { href: '/toc', label: 'Bible', icon: '📖' },
  { href: '/ask', label: 'Ask', icon: '💬' },
  { href: '/search', label: 'Search', icon: '🔍' },
  { href: '/dashboard', label: 'Profile', icon: '👤' },
]

export default function ModernBottomNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile bottom bar */}
      <nav className="md:hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 56, zIndex: 30, background: '#FFFFFF', borderTop: '1px solid #ECEAE6', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {TABS.map((t) => {
          const active = pathname === t.href || (t.href !== '/' && pathname.startsWith(t.href))
          return (
            <Link key={t.href} href={t.href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: active ? 600 : 400, color: active ? '#0F3460' : '#AAAAAA' }}>{t.label}</span>
              {active && <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#0F3460' }} />}
            </Link>
          )
        })}
      </nav>

      {/* Desktop left sidebar */}
      <nav className="hidden md:flex" style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 64, zIndex: 30, background: '#FFFFFF', borderRight: '1px solid #ECEAE6', flexDirection: 'column', alignItems: 'center', paddingTop: 16, gap: 8 }}>
        {TABS.map((t) => {
          const active = pathname === t.href || (t.href !== '/' && pathname.startsWith(t.href))
          return (
            <Link key={t.href} href={t.href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0', width: '100%' }} title={t.label}>
              <span style={{ fontSize: 20, opacity: active ? 1 : 0.5 }}>{t.icon}</span>
              {active && <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#0F3460' }} />}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
