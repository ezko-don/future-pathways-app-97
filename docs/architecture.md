# Architecture — KaziFuture

## 1. Current Tech Stack (as built)

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | React 19 + TanStack Start (SSR) + TanStack Router | File-based routing under `src/routes` |
| Styling / UI | Tailwind CSS v4 + Radix UI primitives (shadcn-style, `src/components/ui`) | |
| State/data | TanStack Query | |
| Backend | TanStack Start **server functions** (`createServerFn`), no separate API service | Runs on the same Vite/Nitro server |
| Database | Supabase Postgres | Managed, with SQL migrations in `supabase/migrations` |
| Auth | Supabase Auth (email/password), roles via `user_roles` table | Session in `localStorage`, so auth-gated routes are `ssr: false` |
| AI | Lovable AI Gateway (`ai.gateway.lovable.dev`), model `google/gemini-2.5-flash` | Called server-side only, key never reaches the client |
| PDF generation | `jspdf`, client-side (`src/lib/report-pdf.ts`) | |
| Build/dev | Vite 8, Bun/npm | |

This is a monolithic, server-rendered React app — **not** microservices. That
choice is intentional for MVP velocity: one deploy target, one database, one
auth system.

## 2. Module Architecture (target — full vision)

```
                     [ KaziFuture Core Engine ]
                          (this repo: TanStack Start + Supabase)
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  [1. AI Navigator]        [2. Career Arena]        [3. Shadow Alley]
  quiz + AI report          gamified simulations      shadowing videos +
  (BUILT)                   + badges (PLANNED)         portfolio evidence
                                                        (PLANNED)
         │                                                   │
         └─────────────────────────┬─────────────────────────┘
                                   ▼
                       [4. Omnichannel Delivery]
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
         { Marketplace }                  { WhatsApp/SMS Bot }
         physical kits, e-commerce         text-based quest flow
         (PLANNED)                         (PLANNED)
```

Every module reads/writes the **same Supabase project** and is keyed off the
same `auth.users.id` (or, for WhatsApp users, a phone number that resolves to
a user). There is one identity, one profile, one role, one progress record —
modules are additive views over that shared user, not separate apps.

## 3. Request Flow (current, AI Navigator)

1. User signs in → Supabase Auth issues a session (stored client-side).
2. `_authenticated` route guard (`src/routes/_authenticated/route.tsx`) calls
   `supabase.auth.getUser()` client-side before rendering; redirects to
   `/auth` if unauthenticated.
3. On the quiz route, the client collects answers and calls the
   `submitQuiz` server function.
4. `submitQuiz` (`src/lib/quiz.functions.ts`):
   - Runs through `requireSupabaseAuth` middleware (server-side session
     check — this is the real security boundary, not the client redirect).
   - Builds a prompt and calls the Lovable AI Gateway for a structured JSON
     report, validated against a Zod schema (`ReportSchema`).
   - Persists the row to `quiz_results` scoped to `user_id`.
   - Returns the report to the client.
5. History route lists past `quiz_results` rows for the signed-in user.
6. PDF export runs entirely client-side against the report already in memory.

## 4. Planned Additions

- **Payments**: M-Pesa STK Push (Daraja API) called from a new server
  function, gating full-PDF download / subscription status stored on
  `profiles` or a new `subscriptions` table. See
  [database.md](./database.md) for the proposed schema.
- **Career Arena**: new tables for simulation tracks, levels, and per-user
  progress/badges; simulation UI as HTML5/Phaser mini-games loaded per
  track.
- **Shadow Alley**: video content records, challenge submissions (file
  upload to Supabase Storage), and generated portfolio-entry records/PDFs.
- **Marketplace**: products, orders, and an "unlock" join table linking an
  order to a premium module.
- **WhatsApp Hub**: a webhook endpoint (Twilio or Turn.io) added as a new
  server function/route, mapping `phone_number → user_id` so progress made
  over text merges into the same account when the user later logs in on
  web.

## 5. Why This Structure

- **One engine, modular extensions** rather than five separate apps —
  avoids duplicated auth/billing/identity work and keeps the "sync across
  channels" requirement (FR-14) cheap: it's just rows in one database.
- **Server functions over a separate API service** — for a solo/small team
  build, colocating server logic with routes removes a whole
  deploy/versioning axis; can be split out later if a module (e.g. the
  WhatsApp webhook) needs independent scaling.
- **RLS-first data model** — every table a user can read/write is
  protected by Postgres Row Level Security, not just app-layer checks, so a
  future WhatsApp webhook or admin dashboard can't accidentally leak
  cross-user data.
