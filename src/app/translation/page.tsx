import Link from 'next/link'

const NT_BOOKS: BookStatus[] = [
  { name: 'Matthew', chapters: 28, completed: 8, status: 'in-progress', note: 'Chapters 1–8 live, 9–28 in progress' },
  { name: 'Mark', chapters: 16, completed: 0, status: 'coming' },
  { name: 'Luke', chapters: 24, completed: 0, status: 'coming' },
  { name: 'John', chapters: 21, completed: 0, status: 'coming' },
  { name: 'Acts', chapters: 28, completed: 0, status: 'coming' },
  { name: 'Romans', chapters: 16, completed: 16, status: 'review', note: '433 verses complete — pending final TR audit' },
  { name: 'I Corinthians', chapters: 16, completed: 0, status: 'coming' },
  { name: 'II Corinthians', chapters: 13, completed: 0, status: 'coming' },
  { name: 'Galatians', chapters: 6, completed: 0, status: 'coming' },
  { name: 'Ephesians', chapters: 6, completed: 0, status: 'coming' },
  { name: 'Philippians', chapters: 4, completed: 0, status: 'coming' },
  { name: 'Colossians', chapters: 4, completed: 0, status: 'coming' },
  { name: 'I Thessalonians', chapters: 5, completed: 0, status: 'coming' },
  { name: 'II Thessalonians', chapters: 3, completed: 0, status: 'coming' },
  { name: 'I Timothy', chapters: 6, completed: 0, status: 'coming' },
  { name: 'II Timothy', chapters: 4, completed: 0, status: 'coming' },
  { name: 'Titus', chapters: 3, completed: 0, status: 'coming' },
  { name: 'Philemon', chapters: 1, completed: 0, status: 'coming' },
  { name: 'Hebrews', chapters: 13, completed: 0, status: 'coming' },
  { name: 'James', chapters: 5, completed: 0, status: 'coming' },
  { name: 'I Peter', chapters: 5, completed: 0, status: 'coming' },
  { name: 'II Peter', chapters: 3, completed: 0, status: 'coming' },
  { name: 'I John', chapters: 5, completed: 0, status: 'coming' },
  { name: 'II John', chapters: 1, completed: 0, status: 'coming' },
  { name: 'III John', chapters: 1, completed: 0, status: 'coming' },
  { name: 'Jude', chapters: 1, completed: 0, status: 'coming' },
  { name: 'Revelation', chapters: 22, completed: 0, status: 'coming' },
]

interface BookStatus {
  name: string
  chapters: number
  completed: number
  status: 'live' | 'in-progress' | 'review' | 'coming'
  note?: string
}

const totalChapters = NT_BOOKS.reduce((s, b) => s + b.chapters, 0)
const completedChapters = NT_BOOKS.reduce((s, b) => s + b.completed, 0)

export default function TranslationPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link
        href="/"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        &larr; Home
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-1">
        Asante Twi Translation
      </h1>
      <p className="text-gray-500 mb-8">
        KJV &rarr; Asante Twi &middot; Anchored to the Textus Receptus
      </p>

      {/* Overall progress */}
      <div className="rounded-xl border border-gray-200 p-5 mb-8">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">New Testament Progress</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {completedChapters} of {totalChapters} chapters translated
            </p>
          </div>
          <span className="text-2xl font-bold text-gray-900">
            {Math.round((completedChapters / totalChapters) * 100)}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(completedChapters / totalChapters) * 100}%` }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Live
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
          In progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400" />
          Under review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-200" />
          Coming
        </span>
      </div>

      {/* Book list */}
      <div className="space-y-3">
        {NT_BOOKS.map((book) => (
          <BookRow key={book.name} book={book} />
        ))}
      </div>

      {/* Source info */}
      <div className="mt-12 rounded-xl border border-gray-100 bg-gray-50 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">About This Translation</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          Every verse is translated from the Scrivener 1894 Textus Receptus Greek text,
          using the King James Bible as the English benchmark. The locked Asante Twi glossary
          ensures theological terms remain consistent across the entire project.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          This is not a paraphrase or dynamic equivalence translation. It is a formal
          equivalence rendering anchored to the preserved text &mdash; word for word,
          verse by verse.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          The translation serves Kai&apos;Ros International&apos;s mission in Kumasi, Ghana,
          and will be deployed on-campus for Twi-primary readers.
        </p>
      </div>

      <p className="mt-10 text-xs text-gray-400 text-center">
        Logos by Kai&apos;Ros &middot; Kai&apos;Ros International &middot; Summit Bible Center
      </p>
    </main>
  )
}

function BookRow({ book }: { book: BookStatus }) {
  const pct = book.chapters > 0 ? (book.completed / book.chapters) * 100 : 0

  const dotColor = {
    'live': 'bg-emerald-500',
    'in-progress': 'bg-amber-400',
    'review': 'bg-blue-400',
    'coming': 'bg-gray-200',
  }[book.status]

  const barColor = {
    'live': 'bg-emerald-500',
    'in-progress': 'bg-amber-400',
    'review': 'bg-blue-400',
    'coming': 'bg-gray-200',
  }[book.status]

  const label = {
    'live': 'Live',
    'in-progress': 'In progress',
    'review': 'Under review',
    'coming': 'Coming',
  }[book.status]

  return (
    <div className="rounded-xl border border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
          <span className="text-sm font-medium text-gray-800">{book.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {book.completed}/{book.chapters} ch
          </span>
          <span className="text-[10px] text-gray-400 uppercase tracking-wide w-20 text-right">
            {label}
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {book.note && (
        <p className="text-xs text-gray-400 mt-1.5">{book.note}</p>
      )}
    </div>
  )
}
