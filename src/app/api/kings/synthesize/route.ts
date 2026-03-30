import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

const BOOK_DATES: Record<string, [number, number]> = {
  'Genesis':[-2000,-1500],'Exodus':[-1500,-1400],'Leviticus':[-1400,-1400],
  'Numbers':[-1400,-1360],'Deuteronomy':[-1400,-1360],'Joshua':[-1400,-1350],
  'Judges':[-1350,-1050],'Ruth':[-1150,-1100],'1 Samuel':[-1100,-1010],
  '2 Samuel':[-1010,-970],'1 Kings':[-970,-850],'2 Kings':[-850,-586],
  '1 Chronicles':[-1010,-970],'2 Chronicles':[-970,-586],'Ezra':[-538,-458],
  'Nehemiah':[-445,-432],'Esther':[-486,-465],'Job':[-2000,-1800],
  'Psalms':[-1000,-400],'Proverbs':[-970,-700],'Ecclesiastes':[-940,-930],
  'Song of Solomon':[-960,-950],'Isaiah':[-740,-680],'Jeremiah':[-627,-586],
  'Lamentations':[-586,-585],'Ezekiel':[-593,-571],'Daniel':[-605,-536],
  'Hosea':[-750,-715],'Joel':[-835,-800],'Amos':[-760,-750],
  'Obadiah':[-586,-585],'Jonah':[-780,-760],'Micah':[-735,-700],
  'Nahum':[-663,-612],'Habakkuk':[-610,-605],'Zephaniah':[-640,-625],
  'Haggai':[-520,-520],'Zechariah':[-520,-480],'Malachi':[-440,-430],
  'Matthew':[-5,30],'Mark':[25,30],'Luke':[-5,30],'John':[25,30],'Acts':[30,62],
  'Romans':[50,58],'1 Corinthians':[53,55],'2 Corinthians':[55,57],
  'Galatians':[48,55],'Ephesians':[60,62],'Philippians':[60,62],
  'Colossians':[60,62],'1 Thessalonians':[50,51],'2 Thessalonians':[51,52],
  '1 Timothy':[63,65],'2 Timothy':[66,67],'Titus':[63,65],'Philemon':[60,62],
  'Hebrews':[60,68],'James':[45,50],'1 Peter':[63,65],'2 Peter':[65,68],
  '1 John':[85,95],'2 John':[85,95],'3 John':[85,95],'Jude':[65,80],
  'Revelation':[90,96],
}

export async function POST(req: NextRequest) {
  const { book, chapter } = await req.json()
  if (!book) return new Response(JSON.stringify({ error: 'book required' }), { status: 400 })

  const dates = BOOK_DATES[book]
  if (!dates) {
    return new Response(JSON.stringify({ error: 'No date mapping for this book' }), { status: 404 })
  }

  const supabase = db()
  const [startDate, endDate] = dates

  async function fetchEntries(s: number, e: number) {
    const [hRes, hsRes] = await Promise.all([
      supabase.from('herodotus_histories')
        .select('book_name, chapter, content, kingdoms, source_tier')
        .not('date_range_start', 'is', null)
        .lte('date_range_start', e).gte('date_range_end', s)
        .order('source_tier', { ascending: true }).limit(8),
      supabase.from('historical_sources')
        .select('source_name, content, kingdoms, geographic_region, source_tier')
        .not('date_range_start', 'is', null)
        .lte('date_range_start', e).gte('date_range_end', s)
        .order('source_tier', { ascending: true }).limit(12),
    ])
    const hData = (hRes.data ?? []).map(r => ({ ...r, source_name: 'herodotus' }))
    return [...hData, ...(hsRes.data ?? [])]
  }

  // Try exact range first, then widen by 200 years if zero
  let allEntries = await fetchEntries(startDate, endDate)
  if (allEntries.length === 0) {
    allEntries = await fetchEntries(startDate - 200, endDate + 200)
  }

  // If still zero after widened range — return legacy formatted entries as fallback
  if (allEntries.length === 0) {
    const encoder = new TextEncoder()
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: `[Historical Context]\n\nThe historical records in our current corpus do not yet cover the exact period of ${book} ${chapter || ''}. As this library grows — Josephus, Edersheim, Herodotus, Tacitus, and others — the coverage for this passage will expand.\n\nWhat we do know: ${book} was written during a period when Israel's story was unfolding against the backdrop of ancient Near Eastern empires. The God who moved through that history is the same God who speaks through this text today. Read it with that confidence.` })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', sources: [] })}\n\n`))
          controller.close()
        }
      }),
      { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
    )
  }

  // Deduplicate source names for attribution
  const sourceNames = new Set<string>()
  for (const e of allEntries) {
    const name = (e as { source_name?: string }).source_name || 'herodotus'
    const display: Record<string, string> = {
      herodotus: 'Herodotus', josephus_antiquities: 'Josephus', josephus_wars: 'Josephus',
      edersheim_life_times: 'Edersheim', edersheim_temple: 'Edersheim', edersheim_ot_history: 'Edersheim',
      maccabees: 'Maccabees', strabo: 'Strabo', philo: 'Philo', tacitus_annals: 'Tacitus',
      tacitus_histories: 'Tacitus', eusebius: 'Eusebius', thucydides: 'Thucydides',
    }
    sourceNames.add(display[name] || name)
  }
  const sources = Array.from(sourceNames)

  // Build context for Sonnet
  const entriesText = allEntries.map(e => e.content).join('\n\n')

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: `You are the Pastor in Logos by Kai'Ros. You have been given historical source material about the world at the time ${book} ${chapter || ''} was written. Synthesize this into a 2-4 paragraph pastoral narrative in your voice — direct, warm, grounded.

Rules:
- Speak as a well-read preacher who has already absorbed the history, not as an academic citing sources
- Answer: what was happening in the world, what political and cultural forces were at play, and how that context illuminates what the author was saying
- Weave the history naturally — "Rome had just..." not "According to Josephus..."
- Do not list source entries. Do not use bullet points. Write flowing prose.
- Open with [Historical Context] badge on the first line
- Close by pointing back to the text — history serves the Word, not the other way around
- Keep it 200-350 words`,
    messages: [{ role: 'user', content: `Historical source material for ${book} ${chapter || ''}:\n\n${entriesText.slice(0, 4000)}` }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`))
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', sources })}\n\n`))
        controller.close()
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Failed to generate narrative' })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
