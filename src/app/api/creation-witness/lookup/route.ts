import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const { verse_reference, verse_text, question, topic_hints } = await req.json()

  const supabase = db()
  const results: Array<{
    source: string
    title: string
    excerpt: string
    topic_tags: string[]
    scripture_references: string[]
    argument_type: string
  }> = []

  // 1. Search by topic hints (highest priority)
  if (topic_hints && Array.isArray(topic_hints) && topic_hints.length > 0) {
    const { data } = await supabase
      .from('creation_witness')
      .select('*')
      .overlaps('topic_tags', topic_hints)
      .limit(5)
    if (data) {
      for (const row of data) {
        results.push({
          source: row.source,
          title: row.title,
          excerpt: row.content.slice(0, 400),
          topic_tags: row.topic_tags,
          scripture_references: row.scripture_references || [],
          argument_type: row.argument_type,
        })
      }
    }
  }

  // 2. Search by scripture reference
  if (verse_reference && results.length < 5) {
    const { data } = await supabase
      .from('creation_witness')
      .select('*')
      .contains('scripture_references', [verse_reference])
      .limit(3)
    if (data) {
      const existingIds = new Set(results.map(r => r.title))
      for (const row of data) {
        if (!existingIds.has(row.title)) {
          results.push({
            source: row.source,
            title: row.title,
            excerpt: row.content.slice(0, 400),
            topic_tags: row.topic_tags,
            scripture_references: row.scripture_references || [],
            argument_type: row.argument_type,
          })
        }
      }
    }
  }

  // 3. Full-text search on verse text or question
  const searchText = [verse_text, question].filter(Boolean).join(' ')
  if (searchText && results.length < 5) {
    // Extract key terms for tsquery
    const terms = searchText
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 6)
      .join(' | ')
    if (terms) {
      const { data } = await supabase
        .from('creation_witness')
        .select('*')
        .textSearch('content', terms, { type: 'plain' })
        .limit(3)
      if (data) {
        const existingIds = new Set(results.map(r => r.title))
        for (const row of data) {
          if (!existingIds.has(row.title)) {
            results.push({
              source: row.source,
              title: row.title,
              excerpt: row.content.slice(0, 400),
              topic_tags: row.topic_tags,
              scripture_references: row.scripture_references || [],
              argument_type: row.argument_type,
            })
          }
        }
      }
    }
  }

  return NextResponse.json({
    results: results.slice(0, 5),
    badge: 'Creation Witness',
    verbal_flag: 'Creation itself bears witness —',
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400' },
  })
}
