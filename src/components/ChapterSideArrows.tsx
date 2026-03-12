'use client'

import Link from 'next/link'

export default function ChapterSideArrows({
  prevHref,
  nextHref,
}: {
  prevHref: string | null
  nextHref: string | null
}) {
  return (
    <>
      {/* Left arrow */}
      {prevHref && (
        <Link
          href={prevHref}
          className="fixed left-2 top-1/2 -translate-y-1/2 z-30 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 text-gray-600 hover:text-gray-900 backdrop-blur-sm transition-all"
          aria-label="Previous chapter"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      )}

      {/* Right arrow */}
      {nextHref && (
        <Link
          href={nextHref}
          className="fixed right-2 top-1/2 -translate-y-1/2 z-30 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 text-gray-600 hover:text-gray-900 backdrop-blur-sm transition-all"
          aria-label="Next chapter"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </>
  )
}
