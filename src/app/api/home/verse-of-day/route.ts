import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function db() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

export async function GET() {
  const supabase = db()
  // Pick a random NT verse for now (personalized selection in future)
  const ntBooks = ['Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation']
  const book = ntBooks[Math.floor(Math.random() * ntBooks.length)]
  const { data: bookRow } = await supabase.from('bible_books').select('id').eq('book_name', book).single()
  if (!bookRow) return NextResponse.json({})

  const { data: verses } = await supabase.from('bible_verses').select('chapter, verse, kjv_text').eq('book_id', bookRow.id).limit(500)
  if (!verses || verses.length === 0) return NextResponse.json({})

  const v = verses[Math.floor(Math.random() * verses.length)]
  return NextResponse.json({ book_name: book, chapter: v.chapter, verse: v.verse, kjv_text: v.kjv_text }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } })
}
