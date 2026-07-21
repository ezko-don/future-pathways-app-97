# Schedule — KaziFuture

High-level timeline. Sprint-level task breakdown lives in
[sprint-plan.md](./sprint-plan.md); this document tracks dates, milestones,
and success metrics. Dates assume 2-week sprints starting from the current
date (**2026-07-21**) and should be adjusted as actual velocity is observed
— treat everything past Sprint 2 as a planning estimate, not a commitment.

## Milestones

| Milestone | Target date | Depends on | Status |
|---|---|---|---|
| M0 — Foundations + Navigator MVP live | 2026-07-21 | Sprint 0–1 | ✅ Done |
| M1 — Monetization live (M-Pesa paywall) | 2026-08-04 | Sprint 2 | ⬜ Planned |
| M2 — WhatsApp channel live | 2026-08-18 | Sprint 3 | ⬜ Planned |
| M3 — Career Arena (2 tracks) live | 2026-09-01 | Sprint 4 | ⬜ Planned |
| M4 — Shadow Alley live | 2026-09-15 | Sprint 5 | ⬜ Planned |
| M5 — Marketplace live | 2026-09-29 | Sprint 6 | ⬜ Planned |
| M6 — First school pilot signed | 2026-10-13 | Sprint 7 | ⬜ Planned |

## Sprint Calendar

| Sprint | Dates | Focus |
|---|---|---|
| Sprint 0 | before 2026-07-20 | Foundations (auth, profiles, roles) |
| Sprint 1 | ending 2026-07-21 | AI Navigator core |
| Sprint 2 | 2026-07-21 → 2026-08-04 | M-Pesa paywall |
| Sprint 3 | 2026-08-04 → 2026-08-18 | WhatsApp/SMS hub |
| Sprint 4 | 2026-08-18 → 2026-09-01 | Career Arena (2 tracks) |
| Sprint 5 | 2026-09-01 → 2026-09-15 | Shadow Alley |
| Sprint 6 | 2026-09-15 → 2026-09-29 | Marketplace |
| Sprint 7 | 2026-09-29 → 2026-10-13 | School B2B + hardening |

## Rationale for Ordering

1. **Navigator first** (done) — smallest module that proves the core AI
   value and is the entry point for every other module.
2. **Monetization before scale-out** — validate willingness to pay (KES 350
   report, subscription) before investing in expensive content (video
   shadowing, physical kits).
3. **WhatsApp before Career Arena** — cheapest way to test reach into the
   rural/low-bandwidth segment; game-quality simulation UI is the most
   expensive module to build, so it's sequenced after distribution risk is
   de-risked.
4. **Career Arena before Shadow Alley** — Shadow Alley's unlock logic
   depends on track completion existing first.
5. **Marketplace after both content modules** — kit purchases unlock
   tutorial modules that need to already exist.
6. **School B2B last** — needs a credible, populated student experience
   (progress + portfolio evidence) to be sellable to a school.

## Success Metrics per Milestone

| Milestone | Primary metric | Target |
|---|---|---|
| M1 | Free→paid conversion on report unlock | ≥5% of completed quizzes |
| M2 | WhatsApp quiz completions | ≥100 in first 2 weeks live |
| M3 | Track completion rate (started → finished) | ≥30% |
| M4 | Challenge submissions per completed track | ≥20% |
| M5 | Kit orders | ≥10 in first month |
| M6 | Schools signed | 1 pilot school, ≥1 cohort |

## Risks to the Schedule

- **AI cost/rate limits** at scale (`quiz.functions.ts` already surfaces
  429/402 explicitly — monitor Lovable AI Gateway usage before WhatsApp
  scale-out increases quiz volume).
- **M-Pesa Daraja sandbox → production approval lead time** — start the
  Safaricom production access request at the beginning of Sprint 2, not the
  end.
- **WhatsApp Business API approval lead time** (Meta/Twilio review) — start
  in parallel with Sprint 2, not at the start of Sprint 3.
- **Video content production** for Shadow Alley (Sprint 5) is not a
  software task — professional filming/partnerships (Safaricom, KenGen,
  local studios) need to be lined up during Sprint 3–4, or M4 slips.
