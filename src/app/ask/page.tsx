'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, Suspense } from 'react'

function AskRedirect() {
  const params = useSearchParams()
  const router = useRouter()
  useEffect(() => {
    const q = params.get('q')
    router.replace(q ? `/study?q=${encodeURIComponent(q)}#pastor` : '/study#pastor')
  }, [params, router])
  return <div className="flex items-center justify-center h-screen"><p className="text-sm text-gray-400">Redirecting...</p></div>
}

export default function AskPage() {
  return <Suspense><AskRedirect /></Suspense>
}
