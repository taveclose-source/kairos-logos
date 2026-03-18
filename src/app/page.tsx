'use client'

import { useState, useEffect } from 'react'
import BibleCover from '@/components/BibleCover'
import BibleOpening from '@/components/BibleOpening'

export default function HomePage() {
  const [isOpening, setIsOpening] = useState(false)

  // Listen for direct TOC open event (from mobile "All Books" button)
  useEffect(() => {
    function handleOpenTOC() {
      setIsOpening(true)
    }
    window.addEventListener('logos:openMainTOC', handleOpenTOC)
    return () => window.removeEventListener('logos:openMainTOC', handleOpenTOC)
  }, [])

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
