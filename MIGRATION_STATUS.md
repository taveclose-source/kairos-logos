# Migration Status — Logos by Kai'Ros

## Supabase Project: logos-by-kairos (xafzgucdwmiwjsupbjbx)

| Migration | Date | Status | Notes |
|---|---|---|---|
| `create_logos_tables` | 2026-03-09 | Applied | Initial schema — 7 tables with RLS enabled |

## Tables Created

| Table | RLS | Description |
|---|---|---|
| `users` | Enabled | User accounts — email, display name, preferred language |
| `bible_books` | Enabled | Book metadata — name, testament (OT/NT), sort order |
| `bible_verses` | Enabled | Verse data — KJV text, Twi text, chapter/verse |
| `twi_glossary` | Enabled | Translation glossary — locked terms enforced |
| `learning_words` | Enabled | Twi vocabulary words for learning app |
| `learning_progress` | Enabled | Per-user learning progress tracking |
| `theological_queue` | Enabled | AI agent Q&A queue with review workflow |

## Seed Data

| Table | Records | Notes |
|---|---|---|
| `twi_glossary` | 6 | Locked terms: Onyankopɔn, Awurade, ɔsoro ahennie, Onipa Ba, amumuyɛ, Gergesefoɔ |

## Pending

- RLS policies (read/write rules per table) — to be defined with auth integration
- Bible book + verse data imports (Romans, Matthew)
- Learning words seed data
