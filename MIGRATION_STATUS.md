# Migration Status — Logos by Kai'Ros

## Supabase Project: logos-by-kairos (xafzgucdwmiwjsupbjbx)

| Migration | Date | Status | Notes |
|---|---|---|---|
| `create_logos_tables` | 2026-03-09 | Applied | Initial schema — 7 tables with RLS enabled |
| `add_rls_policies_bible_tables` | 2026-03-09 | Applied | Public read, anon insert for seeding |
| `tighten_bible_rls_policies` | 2026-03-09 | Applied | Removed anon insert, admin-only writes |

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
| `bible_books` | 66 | All 66 books, OT/NT, sort order 1-66 |
| `bible_verses` | 31,100 | Full KJV Bible, all 66 books |
| `bible_verses` (Twi) | 235 | Matthew 1-8 Asante Twi translations |
| `learning_words` | 48 | 16 greetings + 16 biblical + 16 vocabulary |

## RLS Policies

| Table | Policy | Type |
|---|---|---|
| `bible_books` | Public read | SELECT |
| `bible_books` | Admin insert/update/delete | service_role only |
| `bible_verses` | Public read | SELECT |
| `bible_verses` | Admin insert/update/delete | service_role only |
| `twi_glossary` | Public read | SELECT |
| `learning_words` | Public read | SELECT |
| `users` | Read own row | auth.uid() = id |
| `learning_progress` | Read own progress | auth.uid() = user_id |
| `theological_queue` | Read own questions | auth.uid() = user_id |

## Pending

- User authentication integration (Supabase Auth)
- INSERT/UPDATE policies for learning_progress (authenticated users)
- INSERT policy for theological_queue (authenticated users)
- Romans Twi translation import
- Matthew chapters 9-28 Twi translation import
