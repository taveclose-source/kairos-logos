'use client'

import { useState } from 'react'
import BibleCover from '@/components/BibleCover'
import BibleOpening from '@/components/BibleOpening'

export default function HomePage() {
  const [isOpening, setIsOpening] = useState(false)

  return (
    <>
      <BibleCover onOpen={() => setIsOpening(true)} />
      {isOpening && (
        <BibleOpening
          isOpen={isOpening}
          onClose={() => setIsOpening(false)}
        />
      )}
    </>
  )
}
