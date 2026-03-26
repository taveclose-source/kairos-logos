# CREATION WITNESS CORPUS — BUILD SPEC
## Logos by Kai'Ros
### March 2026

---

## THEOLOGICAL FOUNDATION

This corpus exists because Romans 1:20 declares it: "For the invisible things of him from the creation of the world are clearly seen, being understood by the things that are made, even his eternal power and Godhead; so that they are without excuse."

Creation is a witness. Science, properly framed, is not the authority — it is the confirmation. The Word declares it. Creation demonstrates it.

This is not science interpreting Scripture. This is Scripture being vindicated by what God already placed in the world.

---

## DESIGN DOCTRINE — CREATION WITNESS LAYER

These rules govern every Pastor response that draws from this corpus. They are non-negotiable.

1. **Scripture declares first.** The Pastor never leads with science. The Word opens every response. Scientific confirmation follows.

2. **Science confirms, never corrects.** If a scientific finding appears to contradict Scripture, the Pastor says so plainly and lands on the Word. The corpus is filtered through a confessional grid — these sources were selected precisely because they affirm Scripture rather than compete with it.

3. **The Creation Witness badge.** Every portion of a Pastor response drawing from this corpus carries a visual badge labeled "Creation Witness" and the verbal flag: "Creation itself bears witness —". The badge is visually distinct from the Historical Context badge.

4. **Inference is labeled inference.** The Pastor distinguishes between what science has confirmed observationally and what remains theoretical or interpretive.

5. **The Pastor does not lead with this corpus unprompted.** Creation Witness content surfaces when: (a) the passage directly touches creation or human design, (b) the user's question explicitly invites scientific confirmation, or (c) the scientific evidence is unambiguous and directly relevant. It never feels forced.

6. **This corpus does not override the locked glossary or the THEOLOGICAL_BRIEF.** Doctrinal decisions remain unchanged. This layer adds confirmation, not doctrine.

---

## TIER 5 — CREATION WITNESS SOURCES

### Source 1 — Answers in Genesis (AiG)
- **Organization:** Answers in Genesis, Ken Ham
- **Alignment:** Young earth creationism, KJV-friendly, fully confessional
- **Coverage:** Biology, genetics, geology, astronomy, archaeology, medicine, human origins, dinosaurs
- **Ingestion target:** Topic-indexed articles from the public AiG article database
- **Priority topics:** Human body complexity, DNA and information theory, flood geology, dinosaurs and the Bible, age of the earth, astronomy and cosmology, Cambrian explosion, human consciousness
- **Target table:** `creation_witness` with source tag 'answers_in_genesis'
- **Notes:** Largest creation science corpus available. Ken Ham's organization has produced hundreds of peer-level articles directly connecting Scripture to observable science.

### Source 2 — Institute for Creation Research (ICR)
- **Organization:** Institute for Creation Research, founded by Henry Morris
- **Alignment:** Young earth creationism, rigorous scientific engagement, Dallas Theological Seminary roots
- **Coverage:** Flood geology, human origins, DNA complexity, physics, astronomy, fossil record
- **Ingestion target:** Acts & Facts magazine archives (public), Days of Praise devotionals (public), technical articles
- **Priority topics:** DNA and information theory, irreducible complexity, flood geology, human origins, age of the earth indicators
- **Target table:** `creation_witness` with source tag 'icr'
- **Notes:** Founded by Henry Morris — the father of modern creation science. Most rigorous scientific engagement of all six sources.

### Source 3 — Creation Ministries International (CMI)
- **Organization:** Creation Ministries International
- **Alignment:** Young earth creationism, international reach
- **Coverage:** Genetics, information theory, biology, human origins, flood geology
- **Ingestion target:** Public articles from creation.com
- **Priority topics:** Genetics and human origins, information theory and DNA, biology and design, flood evidence
- **Target table:** `creation_witness` with source tag 'cmi'
- **Notes:** Particularly strong on genetics and information theory. International reach relevant for Ghana deployment. CMI has done significant ministry work in Africa.

### Source 4 — Discovery Institute
- **Organization:** Discovery Institute, Center for Science and Culture
- **Alignment:** Intelligent Design — broader scientific acceptance than young earth sources
- **Coverage:** Irreducible complexity, information theory, consciousness, fine-tuning of the universe
- **Ingestion target:** Public articles and essays from discovery.org and evolutionnews.org
- **Priority topics:** Irreducible complexity (human eye, bacterial flagellum, blood clotting), information in DNA, fine-tuning of physical constants, consciousness and the mind
- **Target table:** `creation_witness` with source tag 'discovery_institute'
- **Notes:** Strongest source for irreducible complexity arguments. Broader scientific acceptance makes these arguments accessible to skeptical users. Not always young earth — use for complexity and design arguments specifically.

### Source 5 — Creation Science Evangelism — Dr. Kent Hovind
- **Organization:** Creation Science Evangelism (CSE), Dr. Kent Hovind
- **Alignment:** Young earth creationism, evangelistic, KJV-anchored, Independent Fundamental Baptist adjacent
- **License:** Explicitly free for distribution. Dr. Hovind has stated publicly: "There is a war going on. You don't ration out bullets during wartime." 1999 seminar edition on Internet Archive marked CC0 1.0 Universal.
- **Coverage:** Age of the earth, Garden of Eden, dinosaurs and the Bible, lies in textbooks, dangers of evolution, flood geology (Hovind Theory), Q&A
- **Ingestion targets:**
  - 1999 Seminar Transcriptions (PDF) — full text of all seven seminars. Internet Archive: https://archive.org/details/creation-science-evangelism-seminar-1999-edition
  - Seminar Notebook — structured companion document explicitly marked "Permission is granted to duplicate for free distribution only." Available at: https://www.creationism.org/videos/KentHovind/HovindCollegeCourses_Notebook.pdf
- **Priority topics:** Age of the earth, dinosaurs and Scripture, evolution's scientific failures, flood geology, human origins, design in nature
- **Target table:** `creation_witness` with source tag 'hovind'
- **Notes:** Hovind's unique value is tone — he is a communicator, not a journal writer. His language is conversational, accessible, and evangelistic. This matches the Pastor's voice better than peer-reviewed articles. When a Ghanaian user asks why evolution is wrong, Hovind's language is closer to how the Pastor should respond. 17 hours of seminar content in text form.

### Source 6 — Seminar Notebook Companion (Hovind College Courses)
- **Organization:** Creation Science Evangelism, indexed by Paul Abramson at creationism.org
- **License:** Free to download and distribute per creationism.org
- **Coverage:** Full college-level creation science curriculum — CSE 101 and CSE 102, nearly 60 hours of structured content with detailed topic indices
- **Ingestion target:** Topic index and structured outline from creationism.org/videos/KentHovind/
- **Target table:** `creation_witness` with source tag 'hovind_college'
- **Notes:** More structured than the seminar transcriptions. Topic-indexed by minute marker — useful for precise argument extraction.

---

## DATABASE SCHEMA

### Table: `creation_witness`
All six sources share one table, distinguished by source tag and topic tags.

```sql
CREATE TABLE creation_witness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'answers_in_genesis' | 'icr' | 'cmi' | 'discovery_institute' | 'hovind' | 'hovind_college'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  topic_tags TEXT[] NOT NULL, -- e.g. ['human_eye', 'irreducible_complexity', 'psalm_139']
  scripture_references TEXT[], -- e.g. ['Psalm 139:14', 'Genesis 1:1', 'Romans 1:20']
  science_domain TEXT, -- 'biology' | 'geology' | 'astronomy' | 'genetics' | 'physics' | 'archaeology'
  argument_type TEXT, -- 'design' | 'complexity' | 'geology' | 'astronomy' | 'origins' | 'refutation'
  source_url TEXT,
  source_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_creation_witness_source ON creation_witness(source);
CREATE INDEX idx_creation_witness_topics ON creation_witness USING gin(topic_tags);
CREATE INDEX idx_creation_witness_scripture ON creation_witness USING gin(scripture_references);
CREATE INDEX idx_creation_witness_domain ON creation_witness(science_domain);
CREATE INDEX idx_creation_witness_search ON creation_witness USING gin(to_tsvector('english', content));
```

---

## TOPIC SEED LIST
These are the priority topics for ingestion. Every source should be queried for articles covering these topics specifically. This keeps the corpus focused rather than attempting to ingest entire websites.

**Human Design and Biology**
- human_eye — irreducible complexity of the eye
- human_body — general fearfully and wonderfully made passages
- dna_complexity — information content of DNA
- blood_clotting — cascade system irreducible complexity
- immune_system — complexity and design
- human_brain — consciousness and the mind

**Origins and Creation**
- age_of_earth — young earth evidence
- genesis_creation — six-day creation scientific support
- adam_and_eve — human origins, genetic bottleneck
- garden_of_eden — geography and archaeology
- cambrian_explosion — sudden appearance of complex life

**Flood Geology**
- noahs_flood — global flood scientific evidence
- flood_geology — sedimentary layers and fossil record
- grand_canyon — flood formation evidence
- ice_age — post-flood ice age model
- hovind_theory — Hovind's specific flood model

**Astronomy and Cosmology**
- fine_tuning — physical constants designed for life
- big_bang_problems — scientific problems with the theory
- starlight — distant starlight and young earth
- moon_recession — lunar recession and age indicators

**Dinosaurs and Scripture**
- dinosaurs_bible — biblical references to dinosaurs
- behemoth_leviathan — Job 40-41 identification
- dragons — historical dragon accounts and dinosaurs
- living_dinosaurs — contemporary sighting accounts

**Evolution Refutation**
- evolution_fraud — fraudulent evidence for evolution
- missing_links — gaps in fossil record
- mutation_limits — limits of genetic mutation
- natural_selection_limits — what natural selection cannot do
- textbook_errors — scientific errors in educational materials

**Archaeology and Biblical History**
- biblical_archaeology — archaeological confirmation of Scripture
- exodus_evidence — archaeological evidence for the Exodus
- flood_evidence_archaeology — cultural flood accounts worldwide

---

## API ROUTE

### POST /api/creation-witness/lookup
Called by the Pastor when a verse or question triggers creation witness content.

Request:
```json
{
  "verse_reference": "Psalm 139:14",
  "verse_text": "I will praise thee; for I am fearfully and wonderfully made...",
  "question": "What does it mean to be fearfully and wonderfully made?",
  "topic_hints": ["human_body", "dna_complexity", "human_eye"]
}
```

Response:
```json
{
  "results": [
    {
      "source": "answers_in_genesis",
      "title": "The Complexity of the Human Eye",
      "excerpt": "...",
      "topic_tags": ["human_eye", "irreducible_complexity"],
      "scripture_references": ["Psalm 139:14"],
      "argument_type": "complexity"
    },
    {
      "source": "hovind",
      "title": "Seminar 1 — Age of the Earth: Human Design",
      "excerpt": "...",
      "topic_tags": ["human_body", "dna_complexity"],
      "argument_type": "design"
    }
  ],
  "badge": "Creation Witness",
  "verbal_flag": "Creation itself bears witness —"
}
```

---

## PASTOR INTEGRATION

### When Creation Witness triggers
The Pastor queries /api/creation-witness/lookup when:
1. The passage being asked about touches creation, human design, origins, or nature
2. The user's question explicitly asks about science, evolution, or creation
3. The verse contains key markers: "fearfully and wonderfully made", "heavens declare", "made man", "formed", "created", "in the beginning"

### How it appears in the response
Pastor response structure when Creation Witness is active:

```
[Theological answer — Scripture leads]

[Creation Witness badge]
"Creation itself bears witness — [scientific confirmation drawn from corpus, 2-4 sentences maximum, conversational tone matching Pastor voice]"

[Closing invitation toward the Lord, not the science]
```

The science never gets more than 2-4 sentences. It confirms. It does not lecture.

### Tone calibration by source
- **AiG, ICR, CMI** — use for precise scientific arguments, statistical data, technical claims
- **Discovery Institute** — use for irreducible complexity arguments, fine-tuning, philosophy of science
- **Hovind** — use for accessible, conversational, evangelistic framing. His voice is closest to the Pastor's voice. Prefer Hovind when the user is a new believer or skeptic.

---

## SAMPLE PASTOR RESPONSE
*User asks about Psalm 139:14 — "I am fearfully and wonderfully made"*

**Without Creation Witness:**
"David declares here that God's formation of each person is an act of wonder and reverence. The word translated 'fearfully' carries the weight of awe — it is the same root used when men tremble before the Lord. You were not assembled randomly. You were made with intention, with care, with the full attention of the Creator."

**With Creation Witness:**
"David declares here that God's formation of each person is an act of wonder and reverence. The word translated 'fearfully' carries the weight of awe — it is the same root used when men tremble before the Lord. You were not assembled randomly. You were made with intention, with care, with the full attention of the Creator.

[Creation Witness] Creation itself bears witness — the human eye alone contains over 130 million photoreceptor cells, processes 1.5 million simultaneous signals, and self-calibrates in ways no human engineering has replicated. Dr. Kent Hovind has noted that Charles Darwin himself admitted the eye gave him trouble: 'To suppose that the eye could have been formed by natural selection seems, I freely confess, absurd in the highest possible degree.' What David declared by the Spirit, the body confirms by its very existence.

What does it mean to you that you were made this way — not by accident, but by design?"

---

## BUILD ORDER

1. Download and parse Hovind 1999 seminar transcriptions from Internet Archive
2. Download and parse Hovind seminar notebook from creationism.org
3. Build scrapers/loaders for AiG, ICR, CMI, Discovery Institute public articles — topic-filtered to seed list above
4. Ingest all six sources into `creation_witness` table with correct tags
5. Build /api/creation-witness/lookup route
6. Integrate lookup into /api/ask Pastor system prompt pipeline — trigger detection on verse markers and question content
7. Build Creation Witness badge component — visually distinct from Historical Context badge
8. Add verbal flag rendering to PastorResponsePanel
9. Run npx next build, commit, push

---

## BUBBY PROMPT

Save this file to C:\Dev\Logos\CREATION-WITNESS-SPEC.md then open a Logos Bubby session and instruct:

"Read CLAUDE.md and CREATION-WITNESS-SPEC.md. Build the Creation Witness corpus layer in this order:
(1) Download and parse the Hovind 1999 seminar transcriptions from Internet Archive and the seminar notebook from creationism.org. Ingest into creation_witness table in Supabase xafzgucdwmiwjsupbjbx with source tag 'hovind'.
(2) Build topic-filtered loaders for AiG (answersingenesis.org), ICR (icr.org), CMI (creation.com), and Discovery Institute (evolutionnews.org) public articles — filter to the priority topic seed list in the spec only.
(3) Ingest all sources into creation_witness table with correct source tags, topic tags, scripture references, and science domain fields.
(4) Build /api/creation-witness/lookup route — accepts verse reference, verse text, question, and topic hints. Returns ranked results from all six sources.
(5) Integrate into the Pastor system prompt pipeline — add trigger detection for creation/design/origins passages and questions. When triggered, fetch creation witness content and inject with the badge and verbal flag per the spec.
(6) Build the Creation Witness badge component — gold cross icon, 'Creation Witness' label, visually distinct from the Historical Context badge.
(7) Wire badge rendering into PastorResponsePanel.
Run npx next build, commit, push."

---

## AUTHORITY NOTICE

The Bible is the sole authority. Creation science confirms what Scripture declares. It does not interpret Scripture, correct Scripture, or compete with Scripture. If any content in this corpus appears to conflict with the KJV text or the locked theological brief, the corpus content is set aside and Scripture stands. This layer adds witness, never doctrine.

*"The heavens declare the glory of God; and the firmament sheweth his handywork." — Psalm 19:1*
