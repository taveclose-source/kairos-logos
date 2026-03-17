import Link from 'next/link'

const FEATURES = [
  { numeral: 'I', title: 'Bible', desc: 'KJV parallel reader with Asante Twi', href: '/bible' },
  { numeral: 'II', title: 'Ask the Word', desc: 'KJV theological AI agent', href: '/ask' },
  { numeral: 'III', title: 'Translation', desc: 'Twi New Testament in progress', href: '/translation' },
  { numeral: 'IV', title: 'Learn', desc: 'Asante Twi vocabulary', href: '/learn' },
]

export default function HomePage() {
  return (
    <div className="relative z-[1]" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <section
        className="flex flex-col lg:flex-row items-start justify-center gap-12 px-6 sm:px-10"
        style={{
          minHeight: 'calc(100vh - 56px)',
          paddingTop: 'clamp(4rem, 12vh, 8rem)',
          paddingBottom: '4rem',
          maxWidth: '1100px',
          margin: '0 auto',
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(200,169,110,0.02) 40px, rgba(200,169,110,0.02) 41px)',
        }}
      >
        <div className="flex-1 max-w-[600px]">
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '10px', letterSpacing: '4px', color: 'var(--gold)', textTransform: 'uppercase', borderLeft: '2px solid var(--gold)', paddingLeft: '12px', marginBottom: '1.5rem' }}>
            Textus Receptus &middot; King James Bible &middot; Asante Twi
          </p>
          <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(42px, 6vw, 72px)', fontWeight: 400, fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.05, marginBottom: '1rem' }}>
            The Word of God.<br />Preserved.
          </h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.9, letterSpacing: '0.5px', maxWidth: '420px', marginBottom: '2.5rem' }}>
            A KJV Bible platform built on the Textus Receptus. Deep study tools, theological AI, and Asante Twi translation — for believers everywhere.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/bible">
              <span className="inline-block transition-colors duration-200 hover:opacity-90" style={{ background: 'var(--gold)', color: 'var(--bg-primary)', padding: '12px 28px', fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', borderRadius: '2px', fontWeight: 500 }}>
                Open the Bible
              </span>
            </Link>
            <Link href="/ask">
              <span className="inline-block transition-all duration-200 hover:border-[var(--gold)] hover:text-[var(--text-primary)]" style={{ border: '1px solid var(--border-medium)', color: 'var(--text-secondary)', padding: '12px 28px', fontFamily: 'var(--font-ui)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', borderRadius: '2px' }}>
                Ask the Word
              </span>
            </Link>
          </div>
        </div>
        <div className="hidden lg:block shrink-0" style={{ background: 'var(--bg-warm)', borderRadius: '4px', padding: '1.5rem', width: '240px' }}>
          <p style={{ fontFamily: 'var(--font-reading)', fontStyle: 'italic', fontSize: '16px', color: '#2C1810', lineHeight: 1.7 }}>
            In the beginning was the Word, and the Word was with God, and the Word was God.
          </p>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: '#8B6914', letterSpacing: '2px', marginTop: '1rem' }}>
            JOHN 1:1
          </p>
        </div>
      </section>
      <section className="px-6 sm:px-10 pb-16 relative z-[1]" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div className="grid sm:grid-cols-4" style={{ borderTop: '1px solid rgba(0,0,0,0.22)' }}>
          {FEATURES.map((f, i) => (
            <Link key={f.href} href={f.href}>
              <div
                className="transition-all duration-200 hover:opacity-80"
                style={{
                  padding: '1.25rem',
                  borderRightWidth: i < FEATURES.length - 1 ? '1px' : '0',
                  borderRightStyle: i < FEATURES.length - 1 ? 'solid' : 'none',
                  borderImage: i < FEATURES.length - 1 ? 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.18) 20%, rgba(0,0,0,0.18) 80%, transparent) 1' : 'none',
                }}
              >
                <span style={{ fontFamily: 'var(--font-reading)', fontSize: '36px', fontWeight: 300, color: 'rgba(245,200,120,0.55)' }}>{f.numeral}</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: '#FFF8F0', marginTop: '0.5rem' }}>{f.title}</p>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: '#E8B878', marginTop: '0.25rem' }}>{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
