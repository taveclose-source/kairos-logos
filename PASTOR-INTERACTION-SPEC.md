# LOGOS — PASTOR INTERACTION SPEC
## Long Press / Right Click Context Menu + Ask the Pastor Feature
### March 2026

---

## INTERACTION MODEL

### Trigger — Mobile
Long press (500ms hold) on any verse paragraph. Works on every verse including verse 1 drop caps. No verse number required.

### Trigger — PC
Right click on any verse paragraph inside the Bible reader. Calls preventDefault() on the right click event scoped strictly to the reader container — browser native context menu suppressed inside reader only, normal everywhere else on the page.

### What opens
A clean context menu anchored near the press/click point containing exactly two options:

1. Ask the Pastor about this verse
2. What was happening in the world?

Menu dismisses on tap/click outside or on Escape key.

---

## FEATURE 1 — ASK THE PASTOR ABOUT THIS VERSE

### What it does
Sends the selected verse plus surrounding context to the Pastor agent. Returns a full theological response drawing from all intelligence layer sources. Displays in a new Pastor response panel.

### Payload sent to agent
{
  reference: "Matthew 1:1",
  verse_text: "The book of the generation of Jesus Christ...",
  context_before: [verse text of preceding 2 verses if available],
  context_after: [verse text of following 2 verses],
  book: "Matthew",
  chapter: 1,
  verse: 1
}

### Agent behavior
The Pastor receives the verse and responds conversationally with:

1. The Word first — what this verse says and means in context
2. Linguistic depth — key words surfaced from Strong's and Gesenius where relevant
3. Name meanings — any proper nouns explained via Hitchcock's and Smith's
4. Cross references — 2-3 related passages that illuminate this verse
5. Historical flavor — if Herodotus or Josephus shed light on the passage, surfaced and flagged with the Historical Context badge per Design Doctrine
6. A closing prompt — one question or thought that sends the user back to prayer or further reading. Never a conclusion. Always an opening.

### Design Doctrine enforcement
- Scripture leads every response
- Historical content carries the verbal flag: "Historically speaking..." and the Historical Context badge
- Response never presents inference as confirmation
- Closes with an invitation toward the Lord, not toward the agent

### Pastor response panel
- Slides up from bottom on mobile — full screen capable
- Opens as right panel on desktop
- Header: verse reference + "The Pastor"
- Body: formatted response with source citations inline
- Footer: "Go deeper" button opens full Resources panel for the verse
- Audio button: when voice system is built this triggers Pastor TTS playback

---

## FEATURE 2 — WHAT WAS HAPPENING IN THE WORLD

### What it does
Already built as Kings and Kingdoms. This context menu option is the trigger that replaces the verse number tap. Behavior unchanged — opens KingsPanel for the passage.

### Change required
Remove verse number as the trigger. Long press / right click context menu is now the sole trigger for Kings and Kingdoms. Verse number tap is retired.

---

## COMPONENT SPEC

### VerseContextMenu.tsx — new component
Props:
  verse: { reference, text, book, chapter, verse_number }
  position: { x, y } — anchor point for menu placement
  onClose: () => void
  onAskPastor: (verse) => void
  onKingsKingdoms: (verse) => void

Menu positions itself to avoid viewport edges. On mobile anchors to bottom of screen as a bottom sheet option row rather than a floating menu.

### PastorResponsePanel.tsx — new component
Props:
  verse: { reference, text, book, chapter, verse_number }
  context: { before: [], after: [] }
  onClose: () => void

Calls /api/pastor/ask with verse payload. Streams response. Renders with source badges. Footer links to Resources panel.

### /api/pastor/ask — new API route
POST
Body: { reference, verse_text, context_before, context_after, book, chapter, verse }

Builds system prompt from:
  - THEOLOGICAL_BRIEF.md posture
  - Design Doctrine (Scripture leads, history flavors, inference labeled)
  - Verse payload

Queries in parallel:
  - Strong's entries for key words in the verse
  - Hitchcock's for any proper nouns
  - Gesenius for Hebrew roots (OT passages)
  - Herodotus/Josephus for historical context if date range available

Returns: streamed Claude response with inline source citations

---

## BIBLEREADER.TSX CHANGES

1. Add onLongPress handler — 500ms timeout, clears on touch end, fires handleVersePress(verse, position)
2. Add onContextMenu handler — scoped to reader container, calls preventDefault(), fires handleVersePress(verse, position)
3. Add verseContextMenu state — { visible, verse, position }
4. Add pastorPanel state — { visible, verse }
5. Render VerseContextMenu when verseContextMenu.visible
6. Render PastorResponsePanel when pastorPanel.visible
7. Remove verse number tap handler for Kings and Kingdoms

---

## VERSE DETECTION

Each verse paragraph needs a data-verse attribute carrying the verse reference so the long press / right click handler knows which verse was pressed:

<p data-verse="Matthew-1-3" data-verse-text="And Judas begat Phares...">

Handler reads data-verse from the target element or its closest parent with that attribute.

---

## BUBBY PROMPT

Open a Logos Bubby session and instruct:

"Read CLAUDE.md and PASTOR-INTERACTION-SPEC.md. Build everything in the spec in this order:
(1) VerseContextMenu component with long press on mobile and right click on PC, scoped preventDefault, dismisses on outside click or Escape.
(2) /api/pastor/ask route — queries all intelligence sources in parallel, builds Pastor response per Design Doctrine, streams back to client.
(3) PastorResponsePanel component — streamed response, source badges, Historical Context badge on historical content, Go Deeper footer link to Resources panel.
(4) Wire everything into BibleReader.
(5) Remove verse number tap as Kings and Kingdoms trigger — context menu is now the sole trigger.
Run npx next build, commit, push."

---

The Pastor answers from the Word. The Word has the last word. Always.
