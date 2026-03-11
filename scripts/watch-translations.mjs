/**
 * Twi Translation Pipeline — File Watcher
 *
 * Watches C:\Dev\Logos\translation-inbox\ for new .json files,
 * validates structure + locked glossary terms, upserts into
 * bible_verses in Supabase, and logs results.
 *
 * Usage:  node scripts/watch-translations.mjs
 */
import { watch, readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, appendFileSync } from 'fs'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// ── Paths ──────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const INBOX = join(ROOT, 'translation-inbox')
const PROCESSED = join(INBOX, 'processed')
const REJECTED = join(INBOX, 'rejected')
const LOG_FILE = join(ROOT, 'translation-log.txt')

for (const dir of [INBOX, PROCESSED, REJECTED]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

// ── Load .env.local ────────────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, '.env.local')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const val = trimmed.slice(eq + 1)
    if (!process.env[key]) process.env[key] = val
  }
}
loadEnv()

// ── Supabase client ────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key in .env.local')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('WARNING: No SUPABASE_SERVICE_ROLE_KEY found — using anon key (may fail on RLS-protected tables)')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Locked glossary terms ──────────────────────────────────
const LOCKED_TERMS = [
  'Onyankopɔn',
  'Awurade',
  'ɔsoro ahennie',
  'Onipa Ba',
  'amumuyɛ',
  'Gergesefoɔ',
]

// ── Helpers ────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString()
  const line = `[${ts}] ${msg}`
  console.log(line)
  appendFileSync(LOG_FILE, line + '\n')
}

function rejectFile(filePath, reason) {
  const name = basename(filePath, '.json')
  const safeName = `${name}__${reason.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}.json`
  const dest = join(REJECTED, safeName)
  renameSync(filePath, dest)
  log(`REJECTED: ${basename(filePath)} → ${safeName}`)
}

function parseFileName(fileName) {
  // Expected: Matthew_9.json, Romans_1.json
  const match = fileName.match(/^([A-Za-z]+(?:\s[A-Za-z]+)?)_(\d+)\.json$/)
  if (!match) return null
  return { book: match[1], chapter: parseInt(match[2]) }
}

// ── Validation ─────────────────────────────────────────────
function validate(data, fileName) {
  const errors = []

  // Check top-level fields
  if (!data.book || typeof data.book !== 'string') {
    errors.push('Missing or invalid "book" field')
  }
  if (!data.chapter || typeof data.chapter !== 'number') {
    errors.push('Missing or invalid "chapter" field (must be number)')
  }
  if (!Array.isArray(data.verses) || data.verses.length === 0) {
    errors.push('Missing or empty "verses" array')
  }

  if (errors.length > 0) return errors

  // Check verse structure
  for (let i = 0; i < data.verses.length; i++) {
    const v = data.verses[i]
    if (!v.verse_number || typeof v.verse_number !== 'number') {
      errors.push(`verses[${i}]: missing or invalid "verse_number"`)
    }
    if (!v.twi_text || typeof v.twi_text !== 'string' || v.twi_text.trim().length === 0) {
      errors.push(`verses[${i}]: missing or empty "twi_text"`)
    }
  }

  if (errors.length > 0) return errors

  // Glossary enforcement: check that locked terms are NOT replaced
  // by variant spellings. Collect all twi_text into one string.
  const allText = data.verses.map(v => v.twi_text).join(' ')

  for (const term of LOCKED_TERMS) {
    // Build a case-insensitive check for common misspellings / alterations
    // We only flag if a near-match is found but the exact term is absent
    // For "Gergesefoɔ" this only applies to Matthew (Gergesenes context)
    // We check presence — if the term should appear, the translator must use it exactly
    const lower = allText.toLowerCase()
    const termLower = term.toLowerCase()

    // Check for variant: same base but different diacritics or suffix
    // Simple heuristic: if a word starts with the first 4 chars of the term
    // but isn't the exact term, flag it
    const base = termLower.slice(0, Math.min(4, termLower.length))
    const words = allText.split(/\s+/)
    for (const word of words) {
      const clean = word.replace(/[.,;:!?"""''()[\]]/g, '')
      if (clean.toLowerCase().startsWith(base) && clean !== term && clean.length >= base.length) {
        // Possible variant — only flag if exact term is NOT present
        if (!allText.includes(term)) {
          errors.push(`Glossary violation: found "${clean}" but locked term is "${term}"`)
          break
        }
      }
    }
  }

  return errors
}

// ── Process a single file ──────────────────────────────────
async function processFile(filePath) {
  const fileName = basename(filePath)
  log(`Processing: ${fileName}`)

  // Parse filename
  const parsed = parseFileName(fileName)
  if (!parsed) {
    rejectFile(filePath, 'bad-filename-format')
    return
  }

  // Read and parse JSON
  let data
  try {
    const raw = readFileSync(filePath, 'utf-8')
    data = JSON.parse(raw)
  } catch (e) {
    rejectFile(filePath, 'invalid-json')
    return
  }

  // Validate
  const errors = validate(data, fileName)
  if (errors.length > 0) {
    log(`  Validation errors: ${errors.join('; ')}`)
    rejectFile(filePath, errors[0])
    return
  }

  // Cross-check filename vs content
  if (data.book !== parsed.book || data.chapter !== parsed.chapter) {
    rejectFile(filePath, `filename-content-mismatch_file-${parsed.book}_${parsed.chapter}_content-${data.book}_${data.chapter}`)
    return
  }

  // Look up book_id
  const { data: bookRow, error: bookErr } = await supabase
    .from('bible_books')
    .select('id')
    .eq('book_name', data.book)
    .single()

  if (bookErr || !bookRow) {
    rejectFile(filePath, `unknown-book-${data.book}`)
    return
  }

  // Upsert verses
  let upsertCount = 0
  let errorCount = 0

  // Process in batches of 50
  const batchSize = 50
  for (let i = 0; i < data.verses.length; i += batchSize) {
    const batch = data.verses.slice(i, i + batchSize)

    for (const v of batch) {
      const { error } = await supabase
        .from('bible_verses')
        .update({ twi_text: v.twi_text, has_twi: true })
        .eq('book_id', bookRow.id)
        .eq('chapter', data.chapter)
        .eq('verse', v.verse_number)

      if (error) {
        log(`  ERROR updating ${data.book} ${data.chapter}:${v.verse_number}: ${error.message}`)
        errorCount++
      } else {
        upsertCount++
      }
    }
  }

  if (errorCount > 0 && upsertCount === 0) {
    rejectFile(filePath, `all-upserts-failed-${errorCount}-errors`)
    return
  }

  // Success — move to processed
  const dest = join(PROCESSED, fileName)
  renameSync(filePath, dest)
  log(`SUCCESS: ${data.book} chapter ${data.chapter} — ${upsertCount} verses upserted${errorCount > 0 ? `, ${errorCount} errors` : ''}`)
}

// ── Debounce: wait for file to finish being written ────────
const pending = new Map()

function scheduleProcess(filePath) {
  if (pending.has(filePath)) clearTimeout(pending.get(filePath))
  pending.set(filePath, setTimeout(async () => {
    pending.delete(filePath)
    try {
      await processFile(filePath)
    } catch (err) {
      log(`UNEXPECTED ERROR processing ${basename(filePath)}: ${err.message}`)
    }
  }, 1000))
}

// ── Watcher ────────────────────────────────────────────────
log('=== Translation Pipeline Started ===')
log(`Watching: ${INBOX}`)
log(`Supabase: ${supabaseUrl}`)
console.log('')
console.log('Drop approved Twi chapter JSON files into:')
console.log(`  ${INBOX}`)
console.log('')
console.log('File format:  Matthew_9.json, Romans_1.json, etc.')
console.log('JSON schema:  { "book": "...", "chapter": N, "verses": [{ "verse_number": N, "twi_text": "..." }] }')
console.log('')
console.log('Press Ctrl+C to stop.')
console.log('')

// Process any files already sitting in the inbox
import { readdirSync } from 'fs'
const existing = readdirSync(INBOX).filter(f => f.endsWith('.json'))
if (existing.length > 0) {
  log(`Found ${existing.length} existing file(s) in inbox — processing...`)
  for (const f of existing) {
    scheduleProcess(join(INBOX, f))
  }
}

// Watch for new files
watch(INBOX, (eventType, fileName) => {
  if (!fileName || !fileName.endsWith('.json')) return
  const filePath = join(INBOX, fileName)
  if (!existsSync(filePath)) return
  scheduleProcess(filePath)
})
