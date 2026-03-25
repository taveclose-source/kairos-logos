'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function ChapterAskBanner({ bookName, chapter }: { bookName: string; chapter: number }) {
  const [show, setShow] = useState(false)
  const [href, setHref] = useState(`/auth/signup?redirect=/study`)

  useEffect(() => {
    const supabase = createSupabaseBrowser()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', user.id)
          .single()
        const tier = data?.subscription_tier ?? 'free'
        if (['scholar', 'ministry', 'missions'].includes(tier)) return
        setHref(`/study?ref=${encodeURIComponent(bookName)}/${chapter}`)
      }
      setShow(true)
    })
  }, [bookName, chapter])

  if (!show) return null

  return (
    <div className="mt-10 rounded-xl border border-emerald-200 bg-emerald-50/50 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
      <p className="text-sm text-gray-700">
        Have a question about this passage?
      </p>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shrink-0"
      >
        Ask the Word &rarr;
      </Link>
    </div>
  )
}
