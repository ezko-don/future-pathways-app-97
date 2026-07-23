# Sprint Plan — KaziFuture

Agile, modular build: ship one module end-to-end before starting the next.
Sprints are 2 weeks. Sprint 1 is complete (reflects the current codebase);
Sprints 2+ are proposed and should be re-confirmed against actual velocity
before each sprint starts.

## Sprint 0 — Foundations (complete)
- TanStack Start + Vite + Tailwind + Radix UI scaffold
- Supabase project wired up (`src/integrations/supabase`)
- `profiles` / `user_roles` schema, signup role selection (parent/student),
  RLS policies, privilege-escalation-safe role assignment

## Sprint 1 — AI Navigator core (complete)
**Goal**: student can take the quiz and get a usable pathway report.
- [x] Quiz UI (`quiz.tsx`) capturing structured answers
- [x] `submitQuiz` server function → Lovable AI Gateway → Zod-validated report
- [x] `quiz_results` table + RLS
- [x] History page listing past results (`history.tsx`)
- [x] Client-side PDF export (`report-pdf.ts`)

**Not yet done from the original Sprint 1 scope**: M-Pesa STK Push paywall
on the full report. Carried into Sprint 2.

## Sprint 2 — Monetize the Navigator (code complete, sandbox test pending)
**Goal**: the one-time "Cluster Report" paywall works end-to-end (KES 350).
- [x] `payments` + `subscriptions` tables (see [database.md](./database.md))
- [x] M-Pesa Daraja integration: STK Push initiate + callback server functions
- [x] Gate full-report PDF/detail behind a successful payment or active
      subscription; free tier keeps summary-only view
- [x] Basic parent-facing billing state in the dashboard
- **Exit criteria**: a real M-Pesa sandbox payment unlocks a report PDF for
  a test account. **Not yet verified** — needs real Daraja sandbox
  credentials and a public callback URL (see [api.md](./api.md)) before this
  can be exercised end-to-end.

## Sprint 3 — WhatsApp extension (fastest path to distribution)
**Goal**: validate engagement cheaply before investing in heavy game UI.
- [ ] WhatsApp Business API integration (Twilio or Turn.io) — webhook route
- [ ] `whatsapp_identities` / `whatsapp_sessions` tables
- [ ] Text version of the Navigator quiz ("Choose Your Own Adventure" flow)
      writing into the same `quiz_results` table
- [ ] Phone-number-to-account merge on subsequent web login
- **Exit criteria**: texting "START" completes a quiz and produces the same
  AI report a web user gets; logging in on web later shows that history.

## Sprint 4 — Career Arena (2 tracks)
**Goal**: gamified simulations for Software Engineering and Agribusiness.
- [ ] `career_tracks` / `track_levels` / `user_track_progress` tables
- [ ] Simulation UI (HTML5/JS, e.g. Phaser) for 2 tracks, 4 levels each
- [ ] Badge award logic on level/track completion
- [ ] Dashboard surfaces recommended track based on latest quiz report
- **Exit criteria**: a student can complete a full track and see a badge on
  their dashboard.

## Sprint 5 — Shadow Alley
**Goal**: unlock real-professional video content + portfolio evidence.
- [ ] `shadow_videos` / `portfolio_entries` tables + private Storage bucket
- [ ] Video unlock gated on matching track completion
- [ ] Challenge project submission (file/image upload)
- [ ] Auto-generated CBC Learner Portfolio Entry (PDF), downloadable/shareable
- **Exit criteria**: completing a challenge produces a portfolio PDF a
  student could hand to a teacher.

## Sprint 6 — Marketplace
**Goal**: physical kit purchase unlocks a matching premium module.
- [ ] `products` / `orders` tables, reusing the Sprint 2 payment flow
- [ ] E-commerce tab (catalog, checkout via M-Pesa)
- [ ] Order → module unlock linkage
- [ ] Fulfillment status visibility for parents
- **Exit criteria**: a test purchase unlocks the corresponding tutorial
  module for that user.

## Sprint 7 — School B2B + polish
**Goal**: first paid school pilot.
- [ ] `admin` role dashboard: aggregated student progress/portfolio view
      scoped to a school
- [ ] Per-school licensing/seat model
- [ ] Hardening pass: RLS review, error states, analytics events for the
      metrics in [schedule.md](./schedule.md)

## Backlog / not yet scheduled
- Native mobile wrapper (if web+WhatsApp proves insufficient)
- Additional Career Arena tracks beyond the first 2
- Airtime micro-billing for WhatsApp premium story paths
- Multi-language content (Swahili)

## Working agreements
- Each sprint ships one demoable increment — no sprint should end without
  something a real user could touch.
- New tables/RLS policies go in as a new file under `supabase/migrations/`,
  never edited in place once applied.
- Update [database.md](./database.md) and [api.md](./api.md) in the same PR
  that introduces the schema/endpoint they document.
