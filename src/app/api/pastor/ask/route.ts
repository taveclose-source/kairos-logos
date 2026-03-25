import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { AGENT_MODEL } from '@/lib/theological-agent'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Approximate BCE date ranges for OT/NT books (same as kings route)
const BOOK_DATES: Record<string, [number, number]> = {
  'Genesis': [-2000, -1500], 'Exodus': [-1500, -1400], 'Leviticus': [-1400, -1400],
  'Numbers': [-1400, -1360], 'Deuteronomy': [-1400, -1360], 'Joshua': [-1400, -1350],
  'Judges': [-1350, -1050], 'Ruth': [-1150, -1100], '1 Samuel': [-1100, -1010],
  '2 Samuel': [-1010, -970], '1 Kings': [-970, -850], '2 Kings': [-850, -586],
  '1 Chronicles': [-1010, -970], '2 Chronicles': [-970, -586], 'Ezra': [-538, -458],
  'Nehemiah': [-445, -432], 'Esther': [-486, -465], 'Job': [-2000, -1800],
  'Psalms': [-1000, -400], 'Proverbs': [-970, -700], 'Ecclesiastes': [-940, -930],
  'Song of Solomon': [-960, -950], 'Isaiah': [-740, -680], 'Jeremiah': [-627, -586],
  'Lamentations': [-586, -585], 'Ezekiel': [-593, -571], 'Daniel': [-605, -536],
  'Hosea': [-750, -715], 'Joel': [-835, -800], 'Amos': [-760, -750],
  'Obadiah': [-586, -585], 'Jonah': [-780, -760], 'Micah': [-735, -700],
  'Nahum': [-663, -612], 'Habakkuk': [-610, -605], 'Zephaniah': [-640, -625],
  'Haggai': [-520, -520], 'Zechariah': [-520, -480], 'Malachi': [-440, -430],
  'Matthew': [-5, 30], 'Mark': [25, 30], 'Luke': [-5, 30], 'John': [25, 30],
  'Acts': [30, 62], 'Romans': [55, 58], '1 Corinthians': [53, 57],
  '2 Corinthians': [55, 57], 'Galatians': [48, 55], 'Ephesians': [60, 62],
  'Philippians': [60, 62], 'Colossians': [60, 62], '1 Thessalonians': [50, 52],
  '2 Thessalonians': [50, 52], '1 Timothy': [62, 66], '2 Timothy': [66, 67],
  'Titus': [63, 65], 'Philemon': [60, 62], 'Hebrews': [64, 68],
  'James': [44, 49], '1 Peter': [63, 65], '2 Peter': [65, 68],
  '1 John': [85, 95], '2 John': [85, 95], '3 John': [85, 95],
  'Jude': [65, 80], 'Revelation': [90, 96],
}

interface PastorRequest {
  reference: string
  verse_text: string
  context_before: string[]
  context_after: string[]
  book: string
  chapter: number
  verse: number
}

export async function POST(req: NextRequest) {
  try {
    const body: PastorRequest = await req.json()
    const { reference, verse_text, context_before, context_after, book, chapter, verse } = body

    if (!reference || !verse_text) {
      return new Response(JSON.stringify({ error: 'reference and verse_text required' }), { status: 400 })
    }

    const supabase = db()

    // ── Query all intelligence sources in parallel ──
    // 1. Get verse words with Strong's numbers
    const wordsPromise = supabase
      .from('verse_words')
      .select('word_text, strongs_number')
      .eq('book', book)
      .eq('chapter', chapter)
      .eq('verse', verse)
      .not('strongs_number', 'is', null)
      .order('word_position')

    // 2. Detect proper nouns for Hitchcock's lookup
    const properNouns = verse_text
      .split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z'-]/g, ''))
      .filter(w => w.length >= 3 && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase())
    const uniqueNames = Array.from(new Set(properNouns.map(n => n.toLowerCase())))

    const hitchcockPromise = uniqueNames.length > 0
      ? supabase
          .from('hitchcock_names')
          .select('name, meaning, language_origin, strongs_number')
          .in('name_normalized', uniqueNames)
      : Promise.resolve({ data: [] })

    // 3. Smith's for proper nouns
    const smithsPromise = uniqueNames.length > 0
      ? supabase
          .from('smiths_dictionary')
          .select('topic, definition, entry_type')
          .in('topic_normalized', uniqueNames)
          .limit(5)
      : Promise.resolve({ data: [] })

    // 4. Historical context — Herodotus (legacy table) + all Tier 4 sources (new table)
    const dates = BOOK_DATES[book]
    const herodotusPromise = dates
      ? supabase
          .from('herodotus_histories')
          .select('book_name, chapter, content, kingdoms, authority_notice')
          .not('date_range_start', 'is', null)
          .lte('date_range_start', dates[1])
          .gte('date_range_end', dates[0])
          .limit(3)
      : Promise.resolve({ data: [] })

    const historicalPromise = dates
      ? supabase
          .from('historical_sources')
          .select('source_name, book_name, chapter, content, kingdoms, geographic_region')
          .not('date_range_start', 'is', null)
          .lte('date_range_start', dates[1])
          .gte('date_range_end', dates[0])
          .limit(6)
      : Promise.resolve({ data: [] })

    // 5. Nave's Topical for key terms
    const navesPromise = uniqueNames.length > 0
      ? supabase
          .from('naves_topical')
          .select('topic, content')
          .in('topic_normalized', uniqueNames)
          .limit(3)
      : Promise.resolve({ data: [] })

    // Execute all in parallel
    const [wordsRes, hitchcockRes, smithsRes, herodotusRes, historicalRes, navesRes] = await Promise.all([
      wordsPromise, hitchcockPromise, smithsPromise, herodotusPromise, historicalPromise, navesPromise,
    ])

    // Gather Strong's entries for the words in this verse
    const strongsNumbers = Array.from(new Set((wordsRes.data ?? []).map(w => w.strongs_number).filter(Boolean)))
    let strongsEntries: { strongs_number: string; original_word: string; transliteration: string | null; definition: string | null; part_of_speech: string | null }[] = []
    let geseniusEntries: { strongs_number: string; hebrew_word: string | null; definition: string; root: string | null }[] = []

    if (strongsNumbers.length > 0) {
      const [seRes, geRes] = await Promise.all([
        supabase
          .from('strongs_entries')
          .select('strongs_number, original_word, transliteration, definition, part_of_speech')
          .in('strongs_number', strongsNumbers),
        supabase
          .from('gesenius_lexicon')
          .select('strongs_number, hebrew_word, definition, root')
          .in('strongs_number', strongsNumbers.filter(n => n.startsWith('H'))),
      ])
      strongsEntries = seRes.data ?? []
      geseniusEntries = geRes.data ?? []
    }

    // ── Build intelligence context ──
    const sections: string[] = []

    if (strongsEntries.length > 0) {
      const wordMap = (wordsRes.data ?? []).reduce((acc, w) => {
        if (w.strongs_number) acc[w.strongs_number] = w.word_text
        return acc
      }, {} as Record<string, string>)

      sections.push('STRONG\'S CONCORDANCE — key words in this verse:\n' +
        strongsEntries.map(e => {
          const eng = wordMap[e.strongs_number] || ''
          return `• "${eng}" → ${e.strongs_number} (${e.original_word}${e.transliteration ? ', ' + e.transliteration : ''}) — ${e.definition || 'no definition'}`
        }).join('\n'))
    }

    if (geseniusEntries.length > 0) {
      sections.push('GESENIUS HEBREW-CHALDEE LEXICON — Hebrew roots:\n' +
        geseniusEntries.map(e =>
          `• ${e.strongs_number} (${e.hebrew_word || '?'}) — ${e.definition}${e.root ? ' [root: ' + e.root + ']' : ''}`
        ).join('\n'))
    }

    if ((hitchcockRes.data ?? []).length > 0) {
      sections.push('HITCHCOCK\'S BIBLE NAMES — proper nouns in this verse:\n' +
        (hitchcockRes.data ?? []).map(h =>
          `• ${h.name} — "${h.meaning}"${h.language_origin ? ' (' + h.language_origin + ')' : ''}${h.strongs_number ? ' [' + h.strongs_number + ']' : ''}`
        ).join('\n'))
    }

    if ((smithsRes.data ?? []).length > 0) {
      sections.push('SMITH\'S BIBLE DICTIONARY — cultural/historical context:\n' +
        (smithsRes.data ?? []).map(s =>
          `• ${s.topic}${s.entry_type ? ' (' + s.entry_type + ')' : ''}: ${s.definition.slice(0, 300)}${s.definition.length > 300 ? '...' : ''}`
        ).join('\n'))
    }

    if ((navesRes.data ?? []).length > 0) {
      sections.push('NAVE\'S TOPICAL BIBLE:\n' +
        (navesRes.data ?? []).map(n =>
          `• ${n.topic}: ${n.content.slice(0, 200)}${n.content.length > 200 ? '...' : ''}`
        ).join('\n'))
    }

    // Combine Herodotus + new historical sources
    const allHistorical: { label: string; content: string; kingdoms?: string[] }[] = []
    for (const h of (herodotusRes.data ?? [])) {
      allHistorical.push({ label: `Herodotus, ${h.book_name} ch.${h.chapter}`, content: h.content, kingdoms: h.kingdoms })
    }
    for (const h of (historicalRes.data ?? [])) {
      const srcLabel = (h.source_name || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      allHistorical.push({ label: `${srcLabel}, ${h.book_name} ch.${h.chapter}`, content: h.content, kingdoms: h.kingdoms })
    }
    if (allHistorical.length > 0) {
      sections.push('HISTORICAL CONTEXT (secular, Tier 4):\n' +
        'NOTE: This is secular historical context. It carries NO theological authority.\n' +
        allHistorical.map(h =>
          `• ${h.label}${h.kingdoms ? ' [' + h.kingdoms.join(', ') + ']' : ''}: ${h.content.slice(0, 250)}${h.content.length > 250 ? '...' : ''}`
        ).join('\n'))
    }

    const intelligenceBlock = sections.length > 0
      ? '\n\n═══ INTELLIGENCE SOURCES (use these to enrich your response) ═══\n\n' + sections.join('\n\n')
      : ''

    // ── Build context lines ──
    const contextLines = []
    if (context_before.length > 0) contextLines.push('Preceding verses: ' + context_before.join(' | '))
    if (context_after.length > 0) contextLines.push('Following verses: ' + context_after.join(' | '))
    const contextBlock = contextLines.length > 0 ? '\n' + contextLines.join('\n') : ''

    // ── System prompt — Pastor mode ──
    const systemPrompt = `You are the Pastor in Logos by Kai'Ros — a confessional Bible study assistant grounded in the King James Bible and the Textus Receptus.

VOICE: Speak the way a seasoned pastor writes in his own hand — direct, warm, anchored in the text. Short sentences that land. No padding. No "Great question!" openers. Open with the Word.

DESIGN DOCTRINE — you MUST follow these rules:
1. Scripture leads every response. Quote the KJV text first, then explain.
2. When you use Strong's or Gesenius data, mention the original word naturally: "The word here is [original] ([transliteration], [Strong's number])..."
3. When you mention a name's meaning from Hitchcock's or Smith's, weave it in: "The name [Name] means '[meaning]'..."
4. When you include historical context from Herodotus or secular sources, you MUST:
   - Prefix with "Historically speaking..."
   - Mark it with [Historical Context] at the start of that paragraph
   - Never present it as theological authority
   - The Bible interprets history, not the other way around
5. Never present inference as confirmation. If you're reasoning beyond the text, say so.
6. Close with ONE question or thought that sends the reader back to prayer or further reading. Never a conclusion. Always an opening. Direct them toward the Lord, not toward you.
7. Include 2-3 cross references that illuminate the verse.
8. When citing sources, tag them inline: [Strong's], [Gesenius], [Hitchcock's], [Smith's], [Nave's], [Historical Context]
9. Keep the response focused — 250-400 words. Rich but not exhausting.

The user is reading ${reference} in the KJV Bible reader.${contextBlock}${intelligenceBlock}`

    const userMessage = `The reader long-pressed on this verse and asked "Ask the Pastor about this verse":

${reference}
"${verse_text}"

Give a pastoral response drawing from the intelligence sources provided. Follow the Design Doctrine exactly.`

    // ── Stream the response ──
    const stream = anthropic.messages.stream({
      model: AGENT_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    let fullAnswer = ''
    const sourceTags = new Set<string>()

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // Send intelligence metadata first
        const sources: string[] = []
        if (strongsEntries.length > 0) sources.push("Strong's")
        if (geseniusEntries.length > 0) sources.push('Gesenius')
        if ((hitchcockRes.data ?? []).length > 0) sources.push("Hitchcock's")
        if ((smithsRes.data ?? []).length > 0) sources.push("Smith's")
        if ((navesRes.data ?? []).length > 0) sources.push("Nave's")
        if ((herodotusRes.data ?? []).length > 0 || (historicalRes.data ?? []).length > 0) sources.push('Historical')

        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'sources', sources })}\n\n`
        ))

        stream.on('text', (text) => {
          fullAnswer += text
          // Detect source tags as they stream
          const tagMatches = fullAnswer.match(/\[(Strong's|Gesenius|Hitchcock's|Smith's|Nave's|Historical Context)\]/gi)
          if (tagMatches) tagMatches.forEach(t => sourceTags.add(t))
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'text', text })}\n\n`
          ))
        })

        stream.on('end', () => {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'done', source_tags: Array.from(sourceTags) })}\n\n`
          ))
          controller.close()
        })

        stream.on('error', (err) => {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: String(err) })}\n\n`
          ))
          controller.close()
        })
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Pastor API error:', error)
    return new Response(JSON.stringify({ error: 'Failed to process. Please try again.' }), { status: 500 })
  }
}
