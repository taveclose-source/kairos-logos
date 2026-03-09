import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const bibleDir = join(__dirname, '..', '..', 'Bible', 'Matthew')

const files = {
  1: 'Matthew1_Twi_Interlinear_Scaffold.json',
  2: 'Matthew2_Twi_Interlinear_Scaffold.json',
  3: 'Matthew3_Twi_Interlinear_Scaffold.json',
  4: 'Matthew4_Twi_Interlinear_Scaffold.json',
  5: 'Matthew5_Twi_Interlinear_Scaffold.json',
  6: 'Matthew6_Twi_Interlinear_Scaffold_v2.json',
  7: 'Matthew7_Scaffold.json',
  8: 'Matthew8_Scaffold.json',
}

function esc(s) { return s.replace(/'/g, "''") }

for (const [ch, fname] of Object.entries(files)) {
  const data = JSON.parse(readFileSync(join(bibleDir, ch, fname), 'utf-8'))
  const rows = []
  for (const v of data.verses) {
    const vn = parseInt(v.ref.split(':')[1])
    if (!vn || !v.twi_text) continue
    rows.push(`(${ch}, ${vn}, '${esc(v.twi_text)}')`)
  }
  const sql = `UPDATE bible_verses SET twi_text = v.twi_text, has_twi = true
FROM (VALUES ${rows.join(',\n')}) AS v(chapter, verse, twi_text)
JOIN bible_books bb ON bb.book_name = 'Matthew'
WHERE bible_verses.book_id = bb.id AND bible_verses.chapter = v.chapter AND bible_verses.verse = v.verse;`

  writeFileSync(join(__dirname, `ch${ch}.sql`), sql)
  console.log(`Ch ${ch}: ${rows.length} verses -> scripts/ch${ch}.sql`)
}
