'use client'

/**
 * Creation Witness badge — visually distinct from Historical Context badge.
 * Gold cross icon with "Creation Witness" label.
 * Used when the Pastor draws from the creation science corpus.
 */
export default function CreationWitnessBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 3,
        background: 'rgba(200,150,10,0.08)',
        border: '1px solid rgba(200,150,10,0.3)',
        fontFamily: 'var(--font-ui)',
        fontSize: 9,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: '#C8960A',
        fontWeight: 600,
      }}
    >
      {/* Gold cross icon */}
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#C8960A" strokeWidth="1.5" strokeLinecap="round">
        <line x1="8" y1="2" x2="8" y2="14" />
        <line x1="3" y1="6" x2="13" y2="6" />
      </svg>
      Creation Witness
    </span>
  )
}
