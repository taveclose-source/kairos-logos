'use client'

import { useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function LastReadTracker({
  book,
  chapter,
}: {
  book: string
  chapter: number
}) {
  useEffect(() => {
    const supabase = createSupabaseBrowser()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('users')
        .update({ last_read_book: book, last_read_chapter: chapter })
        .eq('id', user.id)
        .then(() => {})
    })
  }, [book, chapter])

  return null
}
