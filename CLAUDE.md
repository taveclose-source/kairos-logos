# Logos by Kai'Ros — CLAUDE.md

Claude Code reads this file automatically when this repo is opened.
Read this fully before executing any task.

---

## What Logos Is

A KJV-based Bible study platform with Twi translation, Strong's concordance, morphological tagging,
and a Pastor AI agent. Built for Summit Bible Center and ultimately for offline-first deployment
in Ghana for Kai'Ros International ministry.

**The KJV is the final authority. The Textus Receptus (TR) is the manuscript foundation.**
This is a confessional platform — never suggest alternative translations or undermining the TR basis.

---

## Entity Context

- **Owner:** Tave Sr. / KAIR
- **Hosted at:** logos.summitbiblecenter.com
- **Ministry context:** Summit Bible Center (501c3), Kai'Ros International (Ghana, 26 children)

---

## Technical Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase — project ID: `xafzgucdwmiwjsupbjbx`
- **Hosting:** Vercel
- **Styling:** Tailwind CSS, dual Classic/Modern theme

---

## Local Paths

```
Project root:    C:\Dev\Logos
Repo:            taveclose-source/kairos-logos
Session handoff: C:\Dev\Logos\SESSION_HANDOFF.md
```

---

## Bubby Session

**Session ID:** 60410248-c626-44d9-bb56-d13291cc21d6  
Resume with: `claude --resume 60410248-c626-44d9-bb56-d13291cc21d6`  
**ALWAYS use `/exit` (with slash) to end session.**

---

## Database Scale

- Strong's concordance: 14,197 entries (~41% coverage)
- Morphological tagging: 444,787 words
- Matthew Twi translation: Ch.1–14 complete; Ch.2 v.1 gap noted; Ch.15–28 not started

---

## What Is Live

- KJV parallel reader
- Matthew Twi translation (partial)
- Strong's concordance
- Morphological tagging
- Pastor AI agent with voice layer
- PWA
- Stripe credit bundles (3 tiers)
- Admin panel
- Scripture memorization
- Communities infrastructure
- Make Us Better ✅ (built March 29, 2026)

---

## Pending Builds (priority order)

1. Chapter summary blurbs restoration (final item from last session — complete first)
2. OT concordance fix
3. Scripture Geography Module Phase 3 (Leaflet.js, scripture_locations/scripture_journeys tables)
4. Luke Twi translation (0/1,151 verses)
5. reMarkable sermon extraction
6. Networking module
7. Pastor voice refinement

---

## Translation Pipeline

- Watcher script: `C:\Dev\Logos\scripts\watch-translations.mjs`
- Launcher: `C:\Dev\Logos\Watch Translations.bat`
- Drop translated JSON into `translation-inbox/`
- Watcher validates glossary terms, imports to Supabase, moves to `processed/`
- Locked glossary: Onyankopɔn, Awurade, ɔsoro ahennie, Onipa Ba, amumuyɛ, Gergesefoɔ

## Watcher Known Issues

- Case-insensitive phrase check — patched
- isPhrase guard — patched  
- Windows double-fire race protection — patched
- **Always kill zombie node processes before starting:** `taskkill /F /IM node.exe`

---

## Design Doctrine

**Offline-first.** Local LLM deployment is the end goal for Ghana distribution.
Every architectural decision should consider: "Does this work without internet in Kumasi?"

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

---

## Session Start Checklist

1. `taskkill /F /IM node.exe` — kill zombie node processes
2. Read `SESSION_HANDOFF.md`
3. Check `C:\Dev\_CONTEXT\OPEN_DECISIONS.md` for Logos items
4. Confirm current translation chapter status before touching translation tables
