'use client'

import { useState, useEffect } from 'react'
import BibleCover from '@/components/BibleCover'
import BibleOpening from '@/components/BibleOpening'
import ModernHome from '@/components/ModernHome'
import { useTheme } from '@/contexts/ThemeContext'

export default function HomePage() {
  const [isOpening, setIsOpening] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    function handleOpenTOC() { setIsOpening(true) }
    window.addEventListener('logos:openMainTOC', handleOpenTOC)
    return () => window.removeEventListener('logos:openMainTOC', handleOpenTOC)
  }, [])

  if (theme === 'modern') return <ModernHome />

  return (
    <>
      {!isOpening && <BibleCover onOpen={() => setIsOpening(true)} />}
      {isOpening && (
        <BibleOpening
          isOpen={isOpening}
          onClose={() => setIsOpening(false)}
        />
      )}
    </>
  )
}
