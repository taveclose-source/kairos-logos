# CLAUDE.md — Logos by Kai'Ros
## Bubby Briefing File | Read this at the start of every session

---

## Project Identity

| Field | Value |
|---|---|
| Project | Logos by Kai'Ros |
| Type | Bible platform — KJV + Asante Twi, AI Theological Agent, Twi Learning App |
| Owner | Tave Close Sr. (Kai'Ros International / Summit Bible Center) |
| File Root | C:\Dev\Logos\ |
| Master Chat | Logos by Kai'Ros master chat on claude.ai |
| Coding Agent | Bubby (Claude Code) |

---

## Supabase Projects

| Project | Details |
|---|---|
| logos-by-kairos | ID: xafzgucdwmiwjsupbjbx — URL: https://xafzgucdwmiwjsupbjbx.supabase.co — ACTIVE |
| kairos-fundraising | ID: oynuryauuglbxjunzcrj — donor data, Stripe, 3D fundraising platform. DO NOT MODIFY DESTRUCTIVELY. |
| EdenPro (reference only) | ID: mzvonofxmqnanyuebudg — Genesis commercial. Completely separate. |

---

## Tech Stack

| Layer | Decision |
|---|---|
| Frontend | Next.js (App Router) — mirrors EdenPro architecture |
| Database | Supabase — typed clients, RLS on all tables, pgvector for AI embeddings |
| Styling | Tailwind CSS |
| Deployment | Vercel — env vars in dashboard, never hardcoded |
| AI | Claude API (claude-sonnet-4-20250514) — confessional system prompts required |
| Translation | TR/KJV-anchored Asante Twi — locked glossary governs all AI outputs |

---

## THEOLOGICAL CONSTRAINTS — CRITICAL

Logos is NOT a neutral Bible tool. It has a confessional identity. The AI agent must NEVER
default to presenting "multiple perspectives" on TR/CT manuscript questions or locked doctrines.

- KJV is the final authority. The agent defends this position — it does not hedge it.
- Textus Receptus / Received Text is the manuscript foundation. Present the TR evidence, not "both sides."
- Locked Twi terms — NEVER alter these without explicit Tave approval:
    Onyankopɔn, Awurade, ɔsoro ahennie, Onipa Ba, amumuyɛ, Gergesefoɔ
- THEOLOGICAL_BRIEF.md (in _MASTER\ folder) governs all system prompts. Read it before writing any agent prompt.
- All agent prompts must pass destabilization testing before deployment.

---

## Ecosystem Map

```
KAI'ROS INTERNATIONAL
├── LOGOS by Kai'Ros                ← this project
│   ├── Bible Reader (KJV + Twi parallel)
│   ├── AI Theological Agent
│   ├── Asante Twi Translation Module
│   ├── Twi Learning App (prototype: twi-learn.html)
│   ├── Why KJV? / Apologetics Module
│   └── API layer → exposes content to FORMED
│
├── FORMED                          ← separate brand, API consumer
│   ├── Children's AI Claymation Series
│   └── Kids Bible interface (pulls from Logos API)
│
└── Kai'Ros Campus (Ghana)
    ├── On-campus Logos deployment
    └── Twi-primary interface
```

---

## Translation Status

| Book | Status |
|---|---|
| Romans | ✅ Complete — 433 verses, TR-audited |
| Matthew Ch. 1–8 | 🔄 In Progress — 865 verses remaining |
| Matthew Ch. 9 | ⬜ Next chapter |
| Glossary | Locked — enforced in all translation and AI outputs |
| Deliverables | JSON + DOCX + PDF per book |
| Source Text | Scrivener 1894 Textus Receptus (KJV as English benchmark) |

---

## File Structure

```
C:\Dev\Logos\                       ← Platform root (this project)
├── CLAUDE.md                       ← this file
├── CLAUDE.md.docx                  ← formatted version
├── MASTER_TASK_LIST.docx           ← full task list with status
├── THEOLOGICAL_BRIEF_FINAL.docx    ← theological brief
├── src\                            ← Next.js app source
├── scripts\                        ← import scripts + data
└── Start Bubby - Logos.bat         ← launcher
```

---

## Phase Summary

| Phase | Focus | Gate |
|---|---|---|
| Phase 0 | Theological Brief + infrastructure | Must complete before Phase 2 |
| Phase 1 | Twi Learning App + Parallel Bible Reader + Translation | No gate — start now |
| Phase 2 | AI Theological Agent | Theological Brief must be complete |
| Phase 3 | FORMED API integration + Children's series | Phase 1 substantially complete |
| Phase 4 | Ghana campus deployment + offline mode | Phase 2 complete |

---

## Deployment Rules

- Make all changes and commit locally throughout the session
- At the end of every session, automatically run git push once as the final action
- Never push mid-session for any reason
- One push, end of session, automatic — no instruction needed from Tave

---

## What NOT To Do

- Do NOT make the AI agent theologically neutral — it has a confessional identity
- Do NOT use kairos-fundraising Supabase (oynuryauuglbxjunzcrj) for Logos platform data
- Do NOT modify locked Twi glossary terms without explicit Tave approval
- Do NOT deploy any AI agent feature before the Theological Brief is written and destabilization tested
- Do NOT use base64 for photo/file storage — known scalability failure
- Do NOT hardcode API keys — Vercel env vars only

---

## Owner Context

Tave Close Sr. is a former missionary to Ghana (2007–2010), owner of Genesis Sprinklers &
Water Management, founder of Summit Bible Center (zero-overhead church, all giving to missions),
and founder of Kai'Ros International (26 children, Kumasi Ghana — 160-child campus vision).
His wife Heather is a published author and Gospel evangelist. Logos by Kai'Ros is a Kingdom
tool, not a commercial product. Build accordingly — this matters beyond the code.

"Work like it depends on me, pray like it depends on Him."

---

## Resuming Bubby

To start a new Claude Code session on this project:
1. Navigate to: C:\Dev\Logos\
2. Run: claude (or double-click "Start Bubby - Logos.bat")
3. Bubby reads this file automatically and has full context.
