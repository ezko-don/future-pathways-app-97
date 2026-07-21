# KaziFuture — Documentation

KaziFuture is a CBC (Competency-Based Curriculum) career-readiness platform for
Kenyan students, built as a modular "super app": an AI pathway navigator, a
gamified career simulation arena, a virtual professional-shadowing
marketplace, a physical project-kit e-commerce extension, and a WhatsApp/SMS
channel for low-bandwidth users.

The codebase currently implements the **first module (AI Career Navigator)**:
authentication, a career-interest quiz, an AI-generated CBC pathway report,
result history, and PDF export. Everything else described in these docs is
the agreed roadmap for the remaining modules.

## Documents in this folder

| Document | Purpose |
|---|---|
| [requirements.md](./requirements.md) | Product scope, personas, functional & non-functional requirements, MVP boundary |
| [architecture.md](./architecture.md) | System architecture, module map, tech stack, data flow |
| [database.md](./database.md) | Current Supabase/Postgres schema + planned schema for future modules |
| [api.md](./api.md) | Server functions / API surface, current and planned |
| [sprint-plan.md](./sprint-plan.md) | Sprint-by-sprint build plan (agile, modular rollout) |
| [schedule.md](./schedule.md) | Timeline, milestones, and target dates |
| [revenue-model.md](./revenue-model.md) | Monetization tiers and pricing |
| [roadmap.md](./roadmap.md) | Full 5-module product vision beyond the MVP |

## Current build status (as of 2026-07-21)

- ✅ Auth (parent/student roles) — `src/routes/auth.tsx`
- ✅ AI Career Navigator quiz — `src/routes/_authenticated/quiz.tsx`
- ✅ AI report generation (Lovable AI Gateway, Gemini 2.5 Flash) — `src/lib/quiz.functions.ts`
- ✅ Result history — `src/routes/_authenticated/history.tsx`
- ✅ PDF export — `src/lib/report-pdf.ts`
- ⬜ M-Pesa paywall for the full report
- ⬜ Career Arena (gamified simulations)
- ⬜ Shadow Alley (virtual shadowing + portfolio evidence)
- ⬜ Marketplace (physical kits)
- ⬜ WhatsApp/SMS bot channel

See [roadmap.md](./roadmap.md) for the full picture and
[sprint-plan.md](./sprint-plan.md) for what's next.
