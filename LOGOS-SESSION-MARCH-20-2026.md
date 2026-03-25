# LOGOS SESSION HANDOFF — March 17–23, 2026
## Session ID: 60410248-c626-44d9-bb56-d13291cc21d6
## Resume: `claude --resume 60410248-c626-44d9-bb56-d13291cc21d6 --dangerously-skip-permissions`

---

## BUILD STATE
- **npx next build**: ✓ Compiled successfully, 42 static pages
- **Last commit**: `eaddde8` — fix: nav dedup, routing, admin feedback, home sections
- **Total commits this session**: 72
- **Vercel project**: `logos-kairos` (prj_WrfmNlWMjJyBpaFQ5rOAg7XAPM56)
- **Live domain**: logos.summitbiblecenter.com
- **Vercel CLI linked**: confirmed via `.vercel/project.json`

---

## ALL 24 PAGES (src/app/**/page.tsx)

| Route | File | Purpose |
|---|---|---|
| `/` | src/app/page.tsx | Bible cover (classic) or ModernHome (modern) |
| `/home` | src/app/home/page.tsx | Authenticated home — greeting, verse of day, continue reading, memorize, community |
| `/toc` | src/app/toc/page.tsx | Main Table of Contents — all 66 books, both themes |
| `/bible` | src/app/bible/page.tsx | Desktop book list (redirects mobile to /) |
| `/bible/[book]/[chapter]` | src/app/bible/[book]/[chapter]/page.tsx | Immersive Bible reader |
| `/ask` | src/app/ask/page.tsx | AI theological agent chat |
| `/search` | src/app/search/page.tsx | Search: verses, Strong's, book+chapter |
| `/memorize` | src/app/memorize/page.tsx | Placeholder — Psalm 119:11 |
| `/community` | src/app/community/page.tsx | Placeholder — Proverbs 27:17 |
| `/glossary` | src/app/glossary/page.tsx | Translation glossary (direct link) |
| `/translation` | src/app/translation/page.tsx | Translation progress + embedded glossary |
| `/learn` | src/app/learn/page.tsx | Twi flashcards |
| `/why-kjv` | src/app/why-kjv/page.tsx | Apologetics module |
| `/pricing` | src/app/pricing/page.tsx | Subscriptions + memory add-on |
| `/contact` | src/app/contact/page.tsx | "Make Us Better" feedback form |
| `/dashboard` | src/app/dashboard/page.tsx | User personal study hub |
| `/admin` | src/app/admin/page.tsx | Admin panel (server component, UUID gated) |
| `/admin/queue` | src/app/admin/queue/page.tsx | Theological queue (legacy) |
| `/settings/profile` | src/app/settings/profile/page.tsx | Edit display_name, username, full_name, location |
| `/settings/memory` | src/app/settings/memory/page.tsx | Memory management, credits, toggle |
| `/missions/apply` | src/app/missions/apply/page.tsx | Missions application form |
| `/missions/sponsor` | src/app/missions/sponsor/page.tsx | Sponsor browse page |
| `/auth/signin` | src/app/auth/signin/page.tsx | Sign in |
| `/auth/signup` | src/app/auth/signup/page.tsx | Sign up |

---

## ALL 21 API ROUTES

| Route | Method | Purpose |
|---|---|---|
| `/api/ask` | POST | Claude streaming chat — Haiku (free) / Sonnet (Scholar+), memory injection |
| `/api/ask/download` | GET | Export conversation as text file |
| `/api/auth/create-user` | POST | Service role upsert on signup |
| `/api/concordance` | GET | Concordance API (legacy) |
| `/api/feedback` | POST | Submit feedback + Resend emails |
| `/api/glossary` | GET | All twi_glossary rows |
| `/api/home/verse-of-day` | GET | Random NT verse |
| `/api/memory` | GET/POST | User memory data CRUD |
| `/api/memory/credits` | GET/POST | Credit balance + Stripe checkout |
| `/api/memory/toggle` | POST | Enable/disable memory |
| `/api/stripe/checkout` | POST | Subscription checkout session |
| `/api/stripe/webhook` | POST | Stripe event handler (subs + memory credits) |
| `/api/strongs/[number]` | GET | Strong's entry + Webster's definition |
| `/api/strongs/concordance` | POST | Strong's + English concordance results |
| `/api/admin/feedback` | GET | All feedback for admin |
| `/api/admin/feedback/[id]/status` | PATCH | Update feedback status |
| `/api/admin/feedback/[id]/notes` | PATCH | Update admin notes |
| `/api/admin/queue` | GET/POST | Theological queue CRUD |
| `/api/admin/users/[id]/tier` | PATCH | Admin tier override |
| `/api/admin/users/[id]/credits` | PATCH | Admin memory credits override |
| `/api/admin/users/[id]/memory` | PATCH | Admin memory toggle |

---

## ALL COMPONENTS (src/components/)

| File | Purpose |
|---|---|
| SiteHeader.tsx | Top nav — theme toggle, hamburger menu, auth links |
| BibleCover.tsx | Classic Bible cover with embossed gold text, swipe-to-open |
| BibleOpening.tsx | Cover opening animation + TOC orchestrator |
| BibleTOC.tsx | Two-page Table of Contents spread (books + chapters) |
| BibleReader.tsx | Immersive parchment Bible reader — Strong's, glossary, Twi, pinch zoom |
| BookSheet.tsx | Slide-up book list sheet |
| ChapterSheet.tsx | Slide-up chapter list with summaries |
| PageTurn.tsx | Single page turn animation (CSS rotateY) |
| StrongsPanel.tsx | 3-tab exhaustive concordance panel (Webster's / Strong's / English) |
| GlossaryModal.tsx | Twi glossary term popup |
| ModernHome.tsx | Modern theme home page (hero + actions) |
| ModernBottomNav.tsx | Modern 5-tab bottom nav (mobile) + left sidebar (desktop) |
| ThemeNav.tsx | Conditionally renders ModernBottomNav for modern theme |
| ChapterAskBanner.tsx | "Ask about this passage" banner at bottom of chapters |
| MemoryBanner.tsx | Post-query memory upsell banner |
| CreditPurchaseModal.tsx | 3-tier memory credit purchase modal |
| MobileRedirect.tsx | Redirects mobile users from /bible to / |
| LastReadTracker.tsx | Silent user reading state updater |
| ChapterSideArrows.tsx | Left/right arrows (legacy, replaced by reader arrows) |
| VerseDisplay.tsx | Legacy verse display (replaced by BibleReader but still imported for glossary) |

---

## THEME SYSTEM

Two themes: `classic` (default) and `modern`

| Aspect | Classic | Modern |
|---|---|---|
| Background | Leather #6B3515 with grain texture | #FAFAF9 light gray |
| Cards | Parchment #F8F2E2 | White #FFFFFF |
| Accent | Gold #FFD060 | Navy #0F3460 |
| Font display | Cinzel | Inter |
| Font body | EB Garamond | Inter |
| Font reading | Cormorant Garamond | Cormorant Garamond |
| Font UI | DM Sans | Inter |

Theme context: `src/contexts/ThemeContext.tsx`
CSS variables: `src/styles/theme.css` with `[data-theme="modern"]` overrides
Toggle: hamburger menu + Bible cover dropdown
Persistence: `users.theme` column + localStorage `logos_theme`

---

## NAVIGATION ROUTING (FINAL)

**Bottom nav (both themes, 5 tabs):**
Home → `/home` | Bible → `/toc` | Ask → `/ask` | Search → `/search` | Profile → `/dashboard`

**Classic top nav LOGOS mark** → `/` (Bible cover)
**Modern top nav LOGOS mark** → `/home`

---

## SUPABASE DATA

### Tables used (not all created this session):
- `bible_books` (66 rows)
- `bible_verses` (31,101 rows)
- `verse_words` (785,204 rows)
- `strongs_entries` (14,197 rows — enriched with OpenScriptures data)
- `chapter_summaries` (1,189 rows)
- `twi_glossary` (86 rows)
- `websters_1828` (102,217 rows — loaded this session)
- `word_morphology` (444,787 rows — NT: 138,013 + OT: 306,774 — loaded this session)
- `users` — columns include: theme, subscription_tier, subscription_status, missions_status, etc.
- `user_memories` — memory_enabled, memory_data jsonb
- `memory_credits` — credits_remaining, auto_reload
- `memory_credit_transactions` — purchase/usage log
- `ask_sessions` — saved conversations for download
- `feedback` — user feedback submissions
- `missions_sponsorships` — sponsor→recipient tracking
- `theological_queue` — pastoral review queue
- `learning_words` — Twi flashcard vocab
- `learning_progress` — user study tracking
- `verse_of_day` — daily verse cache (may need creation)

### Database triggers:
- `on_auth_user_created` → auto-creates `public.users` row on signup

### RPC functions (need creation via dashboard — MCP was down):
- `add_memory_credits(p_user_id, p_credits, p_price_id, p_payment_intent)`
- `deduct_memory_credits(p_user_id, p_credits)`

---

## STRIPE CONFIGURATION

### Subscription Price IDs:
| Product | Price ID | Env Var |
|---|---|---|
| Scholar Monthly $9.99 | price_1TBeotE7ubUhvDtecTt1noAo | STRIPE_SCHOLAR_MONTHLY_PRICE_ID |
| Scholar Annual $99 | price_1TBextE7ubUhvDteFIKNVuNs | STRIPE_SCHOLAR_ANNUAL_PRICE_ID |
| Ministry Monthly $29.99 | price_1TBf4sE7ubUhvDtececLeIPN | STRIPE_MINISTRY_MONTHLY_PRICE_ID |
| Ministry Annual $299 | price_1TBf6UE7ubUhvDteHbiUjgjL | STRIPE_MINISTRY_ANNUAL_PRICE_ID |
| Missions $99 one-time | price_1TBf7eE7ubUhvDteAm9K6J4c | STRIPE_MISSIONS_PRICE_ID |

### Memory Credit Price IDs:
| Product | Price ID | Env Var |
|---|---|---|
| Starter 600 credits $2.99 | price_1TCSSCE7ubUhvDtetkb8wbXU | NEXT_PUBLIC_STRIPE_MEMORY_STARTER |
| Standard 1000 credits $4.99 | price_1TCSY7E7ubUhvDteJpKlA8eB | NEXT_PUBLIC_STRIPE_MEMORY_STANDARD |
| Value 2100 credits $9.99 | price_1TCSYiE7ubUhvDtec7fAwd57 | NEXT_PUBLIC_STRIPE_MEMORY_VALUE |

### Stripe Keys:
- `STRIPE_SECRET_KEY` = sk_live_51T1uAdE7ubUhvDte...
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = pk_live_51T1uAdE7ubUhvDte...
- `STRIPE_WEBHOOK_SECRET` = whsec_RYtvCLxwOkO7r9W6ThZcaenzI4aSDvHe
- Webhook endpoint: https://logos.summitbiblecenter.com/api/stripe/webhook

---

## RESEND CONFIGURATION
- **API Key**: `RESEND_API_KEY=re_E5FoetaK_719Np5vPFmSE3W6ipCqVWPbc`
- **Sending domain**: summitbiblecenter.com (verified)
- **From address**: logos@summitbiblecenter.com
- **Admin notify**: pastortave@summitbiblecenter.com
- **Used in**: `/api/feedback/route.ts` (auto-reply + admin notification)

---

## ADMIN ACCESS
- **Admin UUID**: `2f4cc459-6fdd-4f41-be4b-754770b28529`
- **Admin email**: pastortave@summitbiblecenter.com
- **ENV var**: `NEXT_PUBLIC_ADMIN_USER_ID`
- **Admin panel tabs**: Users, Missions, Sponsorships, Revenue, Feedback
- **Admin check**: In-page (server component) at `/admin`, API routes verify UUID

---

## PENDING TASKS (Priority Order)

### P0 — Critical
1. **Supabase RPC functions**: `add_memory_credits` and `deduct_memory_credits` need creation via Supabase dashboard (MCP was down during session)
2. **users.theme column**: Needs `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme text DEFAULT 'classic'` via dashboard
3. **verse_of_day table**: May need creation for verse caching
4. **verse_words data gaps**: ~26% of verses have missing trailing words in verse_words table. Code fix is in place (trailing text detection) but the data should be repaired at the source.

### P1 — High Priority
5. **Press-and-hold on verses**: Spec written in prompt but not implemented. Touch hold 600ms → popup "Ask Logos about this verse" → navigate to /ask with prefilled question.
6. **Classic bottom nav**: Currently only the reader has All Books / All Chapters bar. Need a 5-tab classic-styled bottom nav for /home, /toc, /search etc.
7. **Memorization full implementation**: /memorize is placeholder. Needs: packs, spaced repetition, progress tracking, streak system.
8. **Community full implementation**: /community is placeholder. Needs: create/join, invite codes, member list, reading progress.
9. **Search improvements**: Current search is basic. Need: full-text verse search ranking, highlight matched terms in results.

### P2 — Important
10. **Personalized verse of day**: For Scholar+ users, use Claude Haiku to select verse based on study history.
11. **Reading progress tracking**: NT/OT/Overall completion percentages on home page.
12. **Auto-reload memory credits**: Stripe Setup Intent flow for saved payment method + automatic charge when credits < 100.
13. **PDF conversation download**: Currently text-only. Need jsPDF or @react-pdf/renderer for branded PDF export.
14. **Memory update after responses**: Extract topics/books from conversation and update user_memories.memory_data.
15. **OT morphology data gap**: 306,774 words loaded but some books may have coverage gaps vs the full Hebrew text.

### P3 — Nice to Have
16. **Modern theme polish**: Some pages still use hardcoded classic colors. Need full audit.
17. **Desktop left sidebar refinement**: Icons need replacement with proper SVGs.
18. **Haptic feedback**: Only on Continue button. Add to all navigation taps on mobile.
19. **Chatterbox TTS research**: Resemble AI hosted API viable for voice. Not built yet.
20. **church→asafo translation review flag**: The Twi term "asafo" for "church" is locked but may need review. This is a theological decision, not a code task.

---

## DATA LOADED THIS SESSION

| Dataset | Rows | Source |
|---|---|---|
| Webster's 1828 Dictionary | 102,217 | github.com/matthewreagan/WebstersEnglishDictionary |
| NT Greek Morphology (OpenGNT) | 138,013 | github.com/eliranwong/OpenGNT |
| OT Hebrew Morphology (OSHB) | 306,774 | github.com/openscriptures/morphhb |
| Strong's enrichment (OpenScriptures) | 14,197 updated | github.com/openscriptures/strongs |

### Strong's enrichment fields added:
- strongs_def (richer definition)
- derivation (etymology with clickable G/H refs)
- outline_of_biblical_usage
- root_words (JSON array)
- total_nt_occurrences (computed from word_morphology)
- total_ot_occurrences (computed)
- all_kjv_translations (computed from verse_words)

---

## SCRIPTS

| Script | Purpose |
|---|---|
| scripts/load-websters.mjs | Load Webster's 1828 dictionary |
| scripts/upgrade-strongs.mjs | Upgrade strongs_entries with OpenScriptures data |
| scripts/load-opengnt.mjs | Load NT Greek morphology from OpenGNT |
| scripts/load-oshb.mjs | Load OT Hebrew morphology from OSHB XML |

---

## KEY FILES CREATED THIS SESSION

### Theme System
- src/contexts/ThemeContext.tsx
- src/styles/theme.css (major updates)
- src/components/ModernHome.tsx
- src/components/ModernBottomNav.tsx
- src/components/ThemeNav.tsx

### Bible Reader Enhancements
- src/components/BibleReader.tsx (major rewrites — Strong's, theme, verse fix)
- src/components/PageTurn.tsx (forwardRef, animation timing)
- src/components/BookSheet.tsx
- src/components/ChapterSheet.tsx
- src/components/StrongsPanel.tsx (3-tab rebuild)
- src/lib/paperSound.ts (550ms stereo with thump)

### Subscription System
- src/lib/permissions.ts
- src/lib/memoryCredits.ts
- src/app/api/stripe/webhook/route.ts
- src/app/api/stripe/checkout/route.ts
- src/app/pricing/page.tsx
- src/app/missions/apply/page.tsx
- src/app/missions/sponsor/page.tsx

### Memory System
- src/app/api/memory/route.ts
- src/app/api/memory/credits/route.ts
- src/app/api/memory/toggle/route.ts
- src/app/settings/memory/page.tsx
- src/components/MemoryBanner.tsx
- src/components/CreditPurchaseModal.tsx

### Contact/Feedback
- src/app/contact/page.tsx
- src/app/api/feedback/route.ts
- src/app/api/admin/feedback/route.ts
- src/app/api/admin/feedback/[id]/status/route.ts
- src/app/api/admin/feedback/[id]/notes/route.ts

### New Pages
- src/app/home/page.tsx
- src/app/toc/page.tsx
- src/app/search/page.tsx
- src/app/memorize/page.tsx
- src/app/community/page.tsx

### PWA
- public/manifest.json
- public/icons/ (15 PNG icons + SVG)
- public/favicon.ico

---

## BUBBY SESSION RESUME

```
cd /d "C:\Dev\Logos"
claude --resume 60410248-c626-44d9-bb56-d13291cc21d6 --dangerously-skip-permissions
```

Or double-click: `Start Bubby - Logos.bat`

---

## CHURCH → ASAFO TRANSLATION REVIEW FLAG

The Twi glossary term `asafo` for `church` is locked (locked=true in twi_glossary table). This is a theological decision by Pastor Tave — the term was chosen deliberately for the Asante Twi context. Any review or change requires explicit Tave approval per CLAUDE.md theological constraints. No code action needed — this is a flag for pastoral review only.

---

*Generated by Bubby (Claude Code) — Session 60410248*
*"Work like it depends on me, pray like it depends on Him."*
