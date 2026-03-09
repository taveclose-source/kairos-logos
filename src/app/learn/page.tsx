'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Word = {
  id: string
  english: string
  twi: string
  category: string
  audio_url: string | null
}

const CATEGORIES = ['All', 'Greetings', 'Biblical', 'Vocabulary'] as const
type Category = (typeof CATEGORIES)[number]

export default function LearnPage() {
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    async function fetchWords() {
      const { data, error } = await supabase
        .from('learning_words')
        .select('id, english, twi, category, audio_url')
      if (!error && data) {
        setWords(data)
      }
      setLoading(false)
    }
    fetchWords()
  }, [])

  const filtered =
    activeCategory === 'All'
      ? words
      : words.filter(
          (w) => w.category.toLowerCase() === activeCategory.toLowerCase()
        )

  function selectCategory(cat: Category) {
    setActiveCategory(cat)
    setCurrentIndex(0)
    setFlipped(false)
    setCompleted(false)
  }

  function handleGotIt() {
    advance()
  }

  function handleSkip() {
    advance()
  }

  function advance() {
    setFlipped(false)
    if (currentIndex + 1 >= filtered.length) {
      setCompleted(true)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  function startOver() {
    setCurrentIndex(0)
    setFlipped(false)
    setCompleted(false)
  }

  const card = filtered[currentIndex]

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-slate-500 hover:text-slate-700"
        >
          &larr; Home
        </Link>

        <h1 className="mb-6 text-center text-2xl font-bold text-slate-800">
          Learn Twi
        </h1>

        {/* Category Tabs */}
        <div className="mb-8 flex justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => selectCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && (
          <p className="text-center text-slate-500">Loading words...</p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-slate-500">
            No words found in this category.
          </p>
        )}

        {!loading && filtered.length > 0 && !completed && card && (
          <>
            {/* Progress */}
            <p className="mb-4 text-center text-sm text-slate-500">
              Card {currentIndex + 1} of {filtered.length}
            </p>

            {/* Flashcard */}
            <div
              className="mx-auto mb-6 h-56 w-full cursor-pointer"
              style={{ perspective: '1000px' }}
              onClick={() => setFlipped(!flipped)}
            >
              <div
                className="relative h-full w-full transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front — English */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white shadow-lg"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                    English
                  </span>
                  <span className="text-2xl font-semibold text-slate-800">
                    {card.english}
                  </span>
                  <span className="mt-4 text-xs text-slate-400">
                    Tap to flip
                  </span>
                </div>

                {/* Back — Twi */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-slate-800 shadow-lg"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <span className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                    Twi
                  </span>
                  <span className="text-2xl font-semibold text-white">
                    {card.twi}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleSkip}
                className="rounded-lg bg-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
              >
                Skip
              </button>
              <button
                onClick={handleGotIt}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Got it
              </button>
            </div>
          </>
        )}

        {!loading && completed && (
          <div className="mt-12 text-center">
            <p className="mb-2 text-xl font-semibold text-slate-800">
              Well done!
            </p>
            <p className="mb-6 text-slate-500">
              You completed all {filtered.length} cards in this set.
            </p>
            <button
              onClick={startOver}
              className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
