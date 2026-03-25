'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function WhyKJVPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <Link
        href="/"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        &larr; Home
      </Link>

      <h1 className="text-3xl sm:text-4xl font-bold mt-2 mb-1">
        Why the King James Bible?
      </h1>
      <p className="text-gray-500 mb-10">
        A pastoral case for the preserved Word of God
      </p>

      {/* ═══ ANCHOR: Psalm 12:6-7 ═══ */}
      <section className="mb-12">
        <blockquote className="border-l-4 border-gray-800 pl-5 py-2 mb-4">
          <p className="text-lg sm:text-xl text-gray-800 leading-relaxed italic">
            &ldquo;The words of the LORD are pure words: as silver tried in a
            furnace of earth, purified seven times. Thou shalt keep them, O LORD,
            thou shalt preserve them from this generation for ever.&rdquo;
          </p>
          <footer className="mt-2 text-sm text-gray-500 not-italic">
            &mdash; Psalm 12:6&ndash;7, KJV
          </footer>
        </blockquote>

        <p className="text-gray-700 leading-relaxed mb-4">
          Before we examine any manuscript, before we weigh any scholarly
          argument, we begin where every question of faith must begin &mdash;
          with what God has said about His own words.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          God did not merely inspire His words. He promised to <em>preserve</em> them.
          Not some of them. Not the general ideas behind them. The <em>words</em> themselves &mdash;
          purified, tested, and kept from this generation forever.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          This is not a secondary doctrine. It is the foundation. If God&apos;s words can be
          lost, corrupted, or improved upon by later scholarship, then Psalm 12 is a broken promise.
          We do not believe it is.
        </p>
        <p className="text-gray-700 leading-relaxed">
          Jesus Himself declared: <em>&ldquo;Heaven and earth shall pass away, but my words
          shall not pass away&rdquo;</em> (Matthew 24:35). The question is not whether God
          preserved His Word &mdash; the question is <em>where</em>.
        </p>

        <SectionAgent
          context="Psalm 12:6-7 and the doctrine of divine preservation of Scripture. The user is reading the introductory section of the Why KJV? apologetics module."
          placeholder="Ask about divine preservation..."
        />
      </section>

      {/* ═══ SECTION 1: Two Streams ═══ */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Two Streams: The Textus Receptus and the Critical Text
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          The history of the Bible in English comes down to two manuscript streams.
          Understanding where they diverge &mdash; and why &mdash; is essential for every
          believer who wants to know that the Book they hold is the Book God wrote.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mt-8 mb-3">
          The Received Text (Textus Receptus)
        </h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Textus Receptus is the Greek New Testament that the church has used, received,
          and transmitted for centuries. It represents the <em>majority</em> of existing Greek
          manuscripts &mdash; over 5,000 copies that agree with remarkable consistency across
          regions, centuries, and scribal traditions.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          This is the text behind the Reformation Bibles: Luther&apos;s German Bible, Tyndale&apos;s
          English New Testament, the Geneva Bible, and the King James Bible of 1611. It is
          sometimes called the &ldquo;Majority Text&rdquo; because its readings are supported
          by the overwhelming majority of surviving manuscripts.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Scrivener 1894 edition codified this tradition with precision. It is the Greek text
          that corresponds word-for-word to the KJV translators&apos; work &mdash; and it is the
          manuscript foundation we use in Logos by Kai&apos;Ros.
        </p>

        <h3 className="text-lg font-semibold text-gray-800 mt-8 mb-3">
          The Critical Text (Westcott-Hort)
        </h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          In 1881, two Cambridge scholars &mdash; Brooke Foss Westcott and Fenton John Anthony
          Hort &mdash; published a Greek New Testament that departed significantly from the
          Received Text. Their work elevated two manuscripts above all others: Codex Vaticanus (B)
          and Codex Sinaiticus (Aleph).
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          These two manuscripts had been largely unused by the church for centuries. Vaticanus
          sat in the Vatican Library, unknown to the Reformers. Sinaiticus was discovered in a
          monastery wastebasket by Constantine Tischendorf in 1844 &mdash; the monks were using
          its pages as kindling.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Critical Text theory assumes that <em>older</em> automatically means <em>better</em>.
          But age alone does not equal accuracy. A manuscript can be old because it was set aside
          as defective &mdash; while faithful copies wore out from constant use and were reverently
          replaced.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          Nearly every modern English Bible &mdash; the NIV, ESV, NASB, CSB &mdash; is translated
          from the Critical Text tradition that descends from Westcott and Hort&apos;s work.
          This is not a minor academic footnote. It affects real verses that real people read.
        </p>

        <SectionAgent
          context="The two manuscript streams: Textus Receptus (majority text, Reformation Bibles, Scrivener 1894) vs. Critical Text (Westcott-Hort 1881, Vaticanus, Sinaiticus). The user is reading the 'Two Streams' section of the Why KJV? apologetics module."
          placeholder="Ask about the manuscript traditions..."
        />
      </section>

      {/* ═══ SECTION 2: What Was Removed ═══ */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          What Was Removed &mdash; and Why It Matters
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          The difference between these two streams is not abstract. When you open a modern
          Bible based on the Critical Text, you will find verses missing, phrases shortened,
          and doctrinal content altered. These are not formatting changes &mdash; they are
          changes to what God said.
        </p>

        <div className="my-6 rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-600">Key Passages Affected</h3>
          </div>
          <div className="divide-y divide-gray-100">
            <VerseComparison
              reference="Acts 8:37"
              kjv="And Philip said, If thou believest with all thine heart, thou mayest. And he answered and said, I believe that Jesus Christ is the Son of God."
              critical="[Entire verse removed]"
              note="The Ethiopian eunuch's confession of faith — removed from modern versions. Without it, Philip baptizes a man who never confesses Christ."
            />
            <VerseComparison
              reference="I John 5:7"
              kjv="For there are three that bear record in heaven, the Father, the Word, and the Holy Ghost: and these three are one."
              critical="[Trinitarian clause removed]"
              note="The clearest Trinitarian statement in all of Scripture — removed from the Critical Text."
            />
            <VerseComparison
              reference="Mark 16:9-20"
              kjv="He that believeth and is baptized shall be saved; but he that believeth not shall be damned..."
              critical="[Bracketed or footnoted as 'not in earliest manuscripts']"
              note="The Great Commission passage in Mark — questioned or removed. Twelve verses of Christ's post-resurrection words."
            />
            <VerseComparison
              reference="Matthew 17:21"
              kjv="Howbeit this kind goeth not out but by prayer and fasting."
              critical="[Entire verse removed]"
              note="Christ's teaching on spiritual warfare through prayer and fasting — removed."
            />
            <VerseComparison
              reference="I Timothy 3:16"
              kjv="God was manifest in the flesh..."
              critical="He was manifest in the flesh..."
              note="'God' changed to 'He' — weakening a direct declaration of Christ's deity."
            />
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed mb-4">
          These are not minor footnotes. They are the words of God, preserved in the Received
          Text for centuries, removed by two scholars in 1881 based on two manuscripts the church
          had largely rejected.
        </p>
        <p className="text-gray-700 leading-relaxed">
          The question every believer must ask is simple: Did God preserve His words as He promised,
          or did He allow them to be lost until nineteenth-century scholarship recovered them? We
          believe Psalm 12:6&ndash;7. We believe Matthew 24:35. We hold the Book.
        </p>

        <SectionAgent
          context="Verses removed or altered in Critical Text editions vs. the Textus Receptus/KJV: Acts 8:37, I John 5:7, Mark 16:9-20, Matthew 17:21, I Timothy 3:16. The user is reading the 'What Was Removed' section of the Why KJV? apologetics module."
          placeholder="Ask about specific verses or changes..."
        />
      </section>

      {/* ═══ SECTION 3: Why This Matters for You ═══ */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Why This Matters for You
        </h2>

        <p className="text-gray-700 leading-relaxed mb-4">
          This is not an academic debate for scholars in ivory towers. This is about
          whether you can open your Bible tonight and know that what you are reading is
          what God said. Not what men <em>think</em> God said. Not what the &ldquo;earliest
          available manuscripts&rdquo; <em>suggest</em> God might have said. What He <em>said</em>.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          The King James Bible stands on the Textus Receptus &mdash; the text received by
          the church, used by the church, and preserved by the hand of God across centuries. It
          was translated by 47 of the finest scholars in the English-speaking world, working in
          committees that checked each other&apos;s work, accountable to the Crown and to the church.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          It has stood for over 400 years. It has been the Bible of revivals, of missionaries,
          of martyrs. It was the Bible that went to the ends of the earth during the greatest
          period of missionary expansion in church history.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          We do not hold the KJV because it is old. We hold it because it is <em>right</em>. Because
          it faithfully renders the preserved text. Because when God promised to keep His words, He
          meant it &mdash; and the Received Text is where He kept them.
        </p>

        <blockquote className="border-l-4 border-gray-800 pl-5 py-2 mt-6">
          <p className="text-lg text-gray-800 leading-relaxed italic">
            &ldquo;Sanctify them through thy truth: thy word is truth.&rdquo;
          </p>
          <footer className="mt-2 text-sm text-gray-500 not-italic">
            &mdash; John 17:17, KJV
          </footer>
        </blockquote>

        <SectionAgent
          context="The practical significance of the KJV/TR position for ordinary believers. Why this is not merely academic. The user is reading the concluding section of the Why KJV? apologetics module."
          placeholder="Ask about the KJV position..."
        />
      </section>

      <footer className="text-center pt-8 border-t border-gray-100">
        <Link
          href="/study"
          className="inline-block px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Ask the Word &rarr;
        </Link>
        <p className="mt-6 text-xs text-gray-400">
          Logos by Kai&apos;Ros &middot; Kai&apos;Ros International &middot; Summit Bible Center
        </p>
      </footer>
    </main>
  )
}

function VerseComparison({
  reference,
  kjv,
  critical,
  note,
}: {
  reference: string
  kjv: string
  critical: string
  note: string
}) {
  return (
    <div className="px-5 py-4">
      <h4 className="text-sm font-semibold text-gray-800 mb-2">{reference}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
        <div>
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">
            KJV (Textus Receptus)
          </span>
          <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{kjv}</p>
        </div>
        <div>
          <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">
            Critical Text
          </span>
          <p className="text-sm text-gray-500 mt-0.5 leading-relaxed italic">{critical}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500">{note}</p>
    </div>
  )
}

function SectionAgent({
  context,
  placeholder,
}: {
  context: string
  placeholder: string
}) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleAsk() {
    if (!question.trim() || loading) return
    setLoading(true)
    setAnswer('')

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), context }),
      })

      const reader = res.body?.getReader()
      if (!reader) {
        setAnswer('Streaming not supported.')
        setLoading(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') {
              setAnswer((prev) => prev + event.text)
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setAnswer('Failed to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span className="inline-block w-5 h-5 rounded-full border border-gray-300 text-center text-xs leading-5">?</span>
        Go deeper &mdash; ask the agent about this section
      </button>
    )
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <button
          onClick={handleAsk}
          disabled={!question.trim() || loading}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          {loading ? '...' : 'Ask'}
        </button>
      </div>
      {answer && (
        <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}
