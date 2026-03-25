# TWI RESOURCES PANEL — BUILD SPEC
## Logos by Kai'Ros
### March 2026

---

## OVERVIEW

The Twi Resources Panel is the mirror of the existing ResourcesPanel on the English/Hebrew/Greek side. Same tabbed architecture, same one-tap trigger behavior, but anchored to Twi vocabulary. When a user taps any word in the Twi parallel column, the Twi Resources Panel opens and surfaces all available linguistic, lexical, and translation data for that word.

This panel completes the bidirectional intelligence layer — English words connect down to Hebrew/Greek roots via Strong's and Gesenius; Twi words connect across to English equivalents and then down to the same roots. The full chain from Twi surface word to Hebrew or Greek origin is traceable in a single panel.

---

## SOURCE DOCUMENTS TO INGEST

### Source 1 — Christaller's Dictionary (Tshi→English)
- **Title:** A Dictionary of the Asante and Fante Language Called Tshi (Chwee, Twi)
- **Author:** J.G. Christaller, Basel German Evangelical Mission
- **Published:** 1881, Basel
- **Pages:** 671
- **Status:** Public domain. Digitized from Oxford University Library. Available at Internet Archive.
- **URL:** https://archive.org/details/adictionaryasan00chrigoog
- **Direction:** Twi word → English meaning
- **Purpose:** Primary Twi lexicon. Look up a Twi word, get its meaning, root, usage, and related forms.
- **Target table:** `twi_lexicon`

### Source 2 — Basel Mission English→Tshi Dictionary
- **Title:** English-Tshi (Asante): A Dictionary (Enyiresi-Twi nsem-asekyere-nhõma)
- **Publisher:** Evangelische Missionsgesellschaft in Basel (Basel Evangelical Missionary Society)
- **Pages:** 247
- **Status:** Public domain. Available at Internet Archive.
- **URL:** https://archive.org/details/englishtshiasant00evaniala
- **Direction:** English word → Asante Twi equivalent
- **Purpose:** Reverse lookup. Functions as Webster's 1828 does for English — look up an English biblical term, get the Twi word(s) that render it.
- **Target table:** `english_twi_lexicon`

### AUTHORITY NOTICE — APPLIES TO BOTH SOURCES
These are Basel Mission documents. They are linguistically authoritative but doctrinally neutral. They inform the translation engine's vocabulary choices. They do not govern doctrinal decisions. The locked glossary governs all theological terms. Christaller and the Basel Mission dictionary serve the language layer only.

---

## DATABASE SCHEMA

### Table 1: `twi_lexicon`
Christaller entries — Twi→English direction.

```sql
CREATE TABLE twi_lexicon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twi_headword TEXT NOT NULL,
  twi_normalized TEXT, -- normalized modern orthography equivalent
  english_gloss TEXT NOT NULL,
  part_of_speech TEXT,
  root_word TEXT,
  usage_examples TEXT,
  dialect_notes TEXT, -- Asante vs Akuapem vs Fante variations
  related_forms TEXT[],
  christaller_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_twi_lexicon_headword ON twi_lexicon(twi_headword);
CREATE INDEX idx_twi_lexicon_normalized ON twi_lexicon(twi_normalized);
CREATE INDEX idx_twi_lexicon_english ON twi_lexicon USING gin(to_tsvector('english', english_gloss));
```

### Table 2: `english_twi_lexicon`
Basel Mission entries — English→Twi direction.

```sql
CREATE TABLE english_twi_lexicon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  english_headword TEXT NOT NULL,
  twi_equivalents TEXT[] NOT NULL,
  usage_context TEXT,
  dialect TEXT DEFAULT 'Asante',
  basel_page INTEGER,
  twi_lexicon_ids UUID[], -- links to twi_lexicon entries
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_english_twi_headword ON english_twi_lexicon(english_headword);
CREATE INDEX idx_english_twi_search ON english_twi_lexicon USING gin(to_tsvector('english', english_headword));
```

### Table 3: `translation_word_index`
Every unique Twi word in the existing translation corpus, fully linked across all intelligence layers.

```sql
CREATE TABLE translation_word_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twi_word TEXT NOT NULL,
  twi_normalized TEXT,
  -- KJV linkage
  kjv_english_word TEXT,
  strongs_number TEXT, -- H#### or G#### format
  -- Source linkage
  twi_lexicon_id UUID REFERENCES twi_lexicon(id),
  english_twi_lexicon_id UUID REFERENCES english_twi_lexicon(id),
  -- Glossary linkage
  is_locked_term BOOLEAN DEFAULT FALSE,
  glossary_approved_rendering TEXT,
  locked_by TEXT, -- 'Tave Sr.' or null
  -- Occurrence data
  occurrence_count INTEGER DEFAULT 0,
  book_occurrences JSONB, -- { "Matthew": 12, "Mark": 7 }
  verse_ids UUID[], -- all verses where this word appears
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_translation_word_twi ON translation_word_index(twi_word);
CREATE INDEX idx_translation_word_strongs ON translation_word_index(strongs_number);
CREATE INDEX idx_translation_word_locked ON translation_word_index(is_locked_term);
```

---

## API ROUTES

### POST /api/twi/lookup
Primary lookup — called when user taps a Twi word.

Request:
```json
{
  "word": "Onyankɔpɔn",
  "verse_reference": "Matthew 1:23",
  "strongs_number": "G2316"
}
```

Response:
```json
{
  "word": "Onyankɔpɔn",
  "christaller": {
    "headword": "Onyankɔpɔn",
    "english_gloss": "God, the Supreme Being",
    "root": "...",
    "usage_examples": "...",
    "page": 342
  },
  "english_twi": {
    "english_headword": "God",
    "twi_equivalents": ["Onyankɔpɔn", "Nyame"],
    "usage_context": "...",
    "page": 89
  },
  "scripture_usage": {
    "occurrence_count": 847,
    "book_breakdown": { "Matthew": 42, "Mark": 38, ... },
    "sample_verses": [...]
  },
  "glossary": {
    "is_locked": true,
    "approved_rendering": "Onyankɔpɔn",
    "locked_by": "Tave Sr.",
    "lock_rationale": "Covenant name. Never substitute Nyame."
  },
  "strongs_link": {
    "number": "G2316",
    "word": "theos",
    "has_gesenius": false,
    "has_strongs": true
  }
}
```

### GET /api/twi/english-lookup?word=grace
Reverse lookup — English word → Twi equivalents. Used by translation pipeline.

### GET /api/twi/translation-index?strongs=G5485
All Twi words used to render a given Strong's number across the existing translation corpus. Critical for consistency checking in Luke and beyond.

---

## COMPONENT SPEC

### TwiResourcesPanel.tsx — new component

```
Props:
  word: string — the tapped Twi word
  verseReference: string — e.g. "Matthew 1:1"
  strongsNumber?: string — if known from verse_words table
  onClose: () => void
  onJumpToStrongs: (number: string) => void
```

Tab structure — tabs only render if data exists for that tab:

**Tab 1: Twi Definition** (Christaller)
- Twi headword in large type
- Part of speech
- English gloss
- Root word with etymology
- Usage examples from Christaller
- Dialect notes (Asante vs Akuapem vs Fante)
- Related forms
- Source citation: "Christaller's Dictionary of the Asante and Fante Language, 1881, p.[n]"

**Tab 2: English Equivalent** (Basel Mission English→Tshi)
- English headword(s) this Twi word translates
- All Twi equivalents listed with usage contexts
- Source citation: "English-Tshi Dictionary, Basel Evangelical Missionary Society, p.[n]"

**Tab 3: Scripture Usage**
- Total occurrence count in Logos translation corpus
- Book-by-book breakdown
- 5 sample verses with references, tappable to navigate
- "See all [n] occurrences" expands full list

**Tab 4: Glossary**
- If locked: shows lock badge, approved rendering, lock rationale, locked-by
- If not locked: shows "Not a locked term" with option to flag for review
- Locked terms display in gold with a lock icon — visually distinct
- Never editable from this panel — glossary changes require Tave Sr. approval only

**Tab 5: Strong's Link**
- If Strong's number is available: shows the H/G number, the Hebrew/Greek word, brief gloss
- "Open in Resources panel" button jumps to the full ResourcesPanel for that Strong's entry
- This is the bridge between the Twi panel and the Hebrew/Greek panel
- If no Strong's link available: "Strong's link not yet mapped for this word"

---

## BIBLEREADER INTEGRATION

The Twi parallel column already renders in BibleReader. Changes needed:

1. Every word in the Twi column gets a `data-twi-word` attribute
2. Tap handler on Twi column words opens TwiResourcesPanel (not ResourcesPanel)
3. ResourcesPanel continues to handle English/Hebrew/Greek side taps
4. Both panels can be open simultaneously on tablet/desktop — side by side
5. On mobile — panels stack, back navigation between them

---

## TRANSLATION PIPELINE INTEGRATION

The translation_word_index table becomes the consistency engine for all future translation work. When translating Luke:

1. Translator encounters a Greek word (e.g. G5485 — charis — grace)
2. Queries /api/twi/translation-index?strongs=G5485
3. Gets back: "In Matthew and Mark you rendered G5485 as 'adom' in 14 occurrences"
4. Cross-references English→Tshi dictionary for all Twi options for 'grace'
5. Cross-references Christaller for full semantic range of 'adom'
6. Checks locked glossary — is 'adom' locked?
7. Decides, locks if needed, proceeds

This eliminates translation inconsistency across books automatically. The translation team never has to manually cross-reference Matthew and Mark — the index does it.

---

## BUILD ORDER

1. Download and ingest Christaller → `twi_lexicon` table
2. Download and ingest Basel English→Tshi → `english_twi_lexicon` table
3. Build `translation_word_index` by parsing existing Matthew + Mark translation in Supabase, extracting all unique Twi words, linking to lexicon tables and Strong's
4. Build API routes: /api/twi/lookup, /api/twi/english-lookup, /api/twi/translation-index
5. Build TwiResourcesPanel component — tabbed, matches ResourcesPanel architecture
6. Wire Twi column tap handler in BibleReader to open TwiResourcesPanel
7. Build Strong's Link bridge — TwiResourcesPanel → ResourcesPanel navigation
8. Run npx next build, commit, push

---

## BUBBY PROMPT

Open a Logos Bubby session and instruct:

"Read CLAUDE.md and TWI-RESOURCES-SPEC.md. Build the Twi Resources Panel in this order:
(1) Download Christaller 1881 and the Basel Mission English-Tshi dictionary from Internet Archive. Ingest both into Supabase xafzgucdwmiwjsupbjbx as twi_lexicon and english_twi_lexicon tables per the schema in the spec.
(2) Build translation_word_index by parsing all existing Twi translation verses in Supabase, extracting unique words, and linking each to its KJV English equivalent, Strong's number, Christaller entry, and glossary lock status.
(3) Build API routes: /api/twi/lookup, /api/twi/english-lookup, /api/twi/translation-index.
(4) Build TwiResourcesPanel component with five tabs: Twi Definition, English Equivalent, Scripture Usage, Glossary, Strong's Link. Architecture mirrors existing ResourcesPanel.
(5) Wire Twi column word taps in BibleReader to open TwiResourcesPanel.
(6) Build the Strong's Link bridge so TwiResourcesPanel can navigate to ResourcesPanel for Hebrew/Greek depth.
Run npx next build, commit, push."

---

*The Word in every language. The same Word. Always.*
