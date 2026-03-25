# LOGOS INTELLIGENCE LAYER — SOURCE MANIFEST
## Updated March 2026
### Logos by Kai'Ros | Summit Bible Center

---

## DESIGN DOCTRINE — AUTHORITY HIERARCHY

This is the non-negotiable theological foundation governing every agent response in Logos. It is not a UI preference. It is a doctrinal position embedded into the system at the architecture level.

**The Bible is the sole authority.**
History is flavor. History is context. History is confirmation.
History is never the answer — it is the backdrop against which the answer stands.

### Practical enforcement in every agent response:

1. **Scripture answers first.** The Pastor's response always leads with the Word. Historical content never opens a response. It follows, supports, and illuminates — it does not lead.

2. **Historical content is visually and verbally flagged.** Any portion of a Pastor response drawing primarily from Tier 4 historical sources must be identified explicitly. Two methods:
   - **In-text verbal flag:** *"Historically speaking..."* / *"The ancient record tells us..."* / *"Outside of Scripture, sources like Josephus record..."*
   - **UI badge:** A subtle label on historically-heavy response sections reading **"Historical Context"** — visually distinct from Scripture-sourced content. Never alarming. Just honest.

3. **The Pastor never presents history as equivalent to Scripture.** Josephus does not carry the weight of Genesis. Herodotus does not carry the weight of Daniel. If history and Scripture appear to conflict, the Pastor says so plainly and lands on Scripture.

4. **Inference is labeled inference.** The Agent Reasoning Protocol's 7-level epistemic ladder governs this. If the Pastor is inferring, it says so. If it is confirming from Scripture, it says so. The user always knows which ground they are standing on.

5. **The Kings and Kingdoms feature is explicitly framed as context, not commentary.** The feature header reads: *"What the world looked like at this moment — for context only. The Word speaks for itself."*

---

## TIER 1 — SCRIPTURE FOUNDATION
*Already integrated*

- **KJV Full Canon** — 66 books, verse-indexed. The final authority on all matters of faith, doctrine, and practice.
- **OpenGNT** — Greek New Testament, morphological tagging, 444,787 words
- **OSHB** — Hebrew Old Testament, morphological tagging
- **Strong's Concordance** — Hebrew and Greek lexicon, every word tagged to original language root

---

## TIER 2 — LINGUISTIC & NAMES AUTHORITY
*Addition approved March 2026*

Purpose: To answer the question a user actually asks — *"What does this name mean and why does it matter?"* Strong's gives the root. These sources give the full answer.

- **Hitchcock's Bible Names Dictionary** — Every proper name in Scripture with Hebrew/Greek origin and meaning. Primary names authority. Triggered automatically when any proper noun appears in a selected passage.
- **Smith's Bible Dictionary** — Names, places, people, and objects with cultural and historical depth. Strong on context surrounding named figures and locations.
- **Nave's Topical Bible** — Thematic cross-reference across the full canon including name occurrences and topical groupings.
- **Gesenius' Hebrew-Chaldee Lexicon** — Root-level Hebrew etymology. The deepest available authority on Old Testament name origins. Used when Hitchcock's gloss requires deeper linguistic grounding.

*All Tier 2 sources are public domain. All are to be parsed, indexed by proper noun, Scripture reference, and Strong's number where applicable, and loaded into Supabase project xafzgucdwmiwjsupbjbx following existing source integration patterns.*

---

## TIER 3 — THEOLOGICAL & ENCYCLOPEDIC
*Already specced*

- **ISBE** — International Standard Bible Encyclopedia. Theological, cultural, and geographical entries cross-referenced to Scripture.
- **Easton's Bible Dictionary** — Theological and cultural entries. Accessible depth on doctrinal and historical topics.

---

## TIER 4 — HISTORICAL & GEOGRAPHICAL
*Already specced + Herodotus added March 2026*

> ⚠️ **AUTHORITY NOTICE — APPLIES TO ALL TIER 4 SOURCES**
> These sources are secular historical records. They are valuable, they are ancient, they are often remarkably confirmatory of Scripture — but they carry no theological authority. Every agent response drawing primarily from this tier must be flagged as historical context per the Design Doctrine above. The Bible interprets history. History does not interpret the Bible.

- **Josephus** — Jewish Antiquities and Jewish Wars. Primary source for Jewish history, Persian and Roman interaction with Israel, Second Temple period events. Confirmatory of Gospel and Acts narrative.
- **Eusebius** — Ecclesiastical History. Church history from apostolic period forward. Early kingdom transitions post-resurrection. Valuable for Acts through Revelation historical backdrop.
- **Philo of Alexandria** — Jewish philosophical and cultural context. Second Temple period. Hellenistic Jewish thought surrounding the New Testament world.
- **Strabo** — Geography and political state of surrounding kingdoms. Foundational for understanding the physical world of Scripture.
- **Tacitus** — Roman world and Greek world adjacent. Corroborates Gospel-era political climate including references to Christ and early Christians.
- **Herodotus** ⭐ *Added March 2026* — The Histories. Primary source for Persian, Babylonian, Egyptian, and Greek history during the period of the major prophets and the Babylonian exile. Critical source for the Kings and Kingdoms feature. Without Herodotus the Old Testament historical backdrop has a significant gap.
- **Thucydides** — Greek world during the intertestamental period. Covers the 400 silent years between Malachi and Matthew from a Greek historical perspective.

---

## TIER 5 — AGENTS & FEATURES DRAWING FROM THIS CORPUS

### The Pastor
*Voice agent. Core of the Logos conversational experience.*

- Conversational voice pipeline: Whisper STT → Claude reasoning across all tiers → TTS synthesis in Pastor Tave Sr.'s voice
- Draws from all tiers in authority order: Tier 1 first, Tier 2 for linguistic depth, Tier 3 for theological context, Tier 4 for historical flavor
- Historical content always flagged per Design Doctrine
- Defers explicitly on matters of personal conviction: *"That's between you and the Lord. Here's what Scripture says."*
- Wake word: **"Pastor"**
- Opens every session: *"What's on your heart?"*

### Kings and Kingdoms
*Added March 2026. Triggered by passage selection.*

- User selects a verse or passage and taps **"Ask the Pastor about this"**
- Standard theological response delivered first
- Optional expansion: **"What was happening in the world?"**
- Agent pulls kingdom-by-kingdom world history at the exact historical moment of the selected passage
- Draws primarily from Tier 4: Herodotus (Babylonian/Persian/Egyptian period), Josephus (Second Temple/Roman period), Strabo (geographical), Thucydides (Greek/intertestamental)
- Feature header displayed to user at all times: *"What the world looked like at this moment — for context only. The Word speaks for itself."*
- All content in this expansion carries the **Historical Context** badge
- Kingdom mapping engine: given a date range extracted from the passage, returns kingdom-by-kingdom activity ranked by proximity and relevance

### Strong's Panel
- Linguistic deep dive on any selected word
- Draws from Tier 1 (Strong's) and Tier 2 (Gesenius' for Hebrew roots, Hitchcock's for proper nouns)

### Names Lookup
*Added March 2026. Triggered by any proper noun in a selected passage.*

- Pastor answers: *"What does this name mean and why does it matter?"*
- Source sequence: Hitchcock's (meaning) → Smith's (cultural context) → Gesenius' (Hebrew root etymology)
- Cross-referenced to Strong's number where applicable
- Theologically framed: name meanings in Scripture are frequently prophetic, covenantal, or narratively significant — the Pastor makes this connection explicit

### Historical Intelligence Layer
- Inline citations from Tier 3 and Tier 4 embedded in Pastor responses where historically relevant
- All inline historical citations carry verbal flag and UI badge per Design Doctrine
- Never leads a response. Always follows Scripture-grounded content.

### Agent Reasoning Protocol
- 7-level epistemic ladder operating across all tiers
- Levels: States / Implies / Confirms / Letter fills / History / Inference / Possible
- Every response internally classified by level
- User-facing language reflects the level honestly — the Pastor does not present inference as confirmation

---

## PENDING BUILDS

- **Names lookup UI** — Proper noun tap triggers name meaning panel inline in the reader
- **Kingdom timeline visualization** — Geographic map showing surrounding kingdom positions at the date of a selected passage. Herodotus + Strabo + Josephus as primary feeds.
- **Intertestamental bridge** — The 400 silent years (Malachi to Matthew) covered by Josephus, Eusebius, and Thucydides. Accessible as a dedicated module so users understand the world Jesus was born into.
- **Twi language support** — XTTS v2 and Whisper both support multilingual architecture. Twi voice pipeline to be added after English voice system is complete. Ghana-facing priority.

---

## VOICE SYSTEM BUILD PLAN
*Approved March 2026 — separate build track*

The Pastor's voice is Pastor Tave Close Sr. No third party. No synthesis from a generic model. The voice is recorded, trained, owned, and deployed entirely within the Logos infrastructure.

**Pipeline:** Whisper STT (open source, self-hosted) → Claude reasoning → XTTS v2 TTS (fine-tuned on Pastor Tave Sr. recordings)

**Phases:**
1. Recording — ~1,400 sentences across 5 sessions
2. Data preparation — automated via Bubby
3. Training — XTTS v2 fine-tune on RunPod (~$4-8 one-time)
4. Inference API — FastAPI server, verse chunking, caching
5. Logos integration — reader, ask page, memorization mode
6. Ghana offline bundle — quantized model, CPU inference, no internet required
7. Voice pipeline — full conversational loop, wake word, session context memory

**Conversational loop:** User speaks → Whisper transcribes → Pastor reasons → Pastor speaks → mic reopens automatically

---

## BUBBY BUILD TRIGGER — TIER 2 INTEGRATION

Save this file to C:\Dev\Logos\LOGOS-INTELLIGENCE-MANIFEST.md then open a Logos Bubby session and instruct:

"Read C:\Dev\Logos\LOGOS-INTELLIGENCE-MANIFEST.md and begin integrating Tier 2 sources — Hitchcock's Bible Names Dictionary, Smith's Bible Dictionary, Nave's Topical Bible, and Gesenius' Hebrew-Chaldee Lexicon. All are public domain. Parse each into Supabase project xafzgucdwmiwjsupbjbx. Index by proper noun, Scripture reference, and Strong's number where applicable. Follow existing source integration patterns. Flag all Tier 2 content in agent responses per the Design Doctrine in this document."

---

*Logos by Kai'Ros — The Word first. Always.*
