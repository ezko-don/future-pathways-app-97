# Revenue Model — KaziFuture

## Pricing Tiers

| Tier / Feature | Target | Pricing Model | Price (KES) | Depends on |
|---|---|---|---|---|
| AI Cluster Report (full PDF) | Parent | One-time paywall | 350 / download | Sprint 2 |
| Monthly Subscription | Parent / Student | Recurring — unlocks all simulations & videos | 499 / month or 1,200 / term | Sprint 2 (billing), Sprint 4–5 (content to unlock) |
| School B2B License | Schools | Annual per-cohort license | 20,000 – 50,000 / year per school | Sprint 7 |
| E-commerce Kits | Parent | Direct physical product sale | 2,500 – 4,500 / box | Sprint 6 |
| WhatsApp Text Quests | Rural consumers | Micro-billing via airtime integration | 10 / story path | Backlog |

## How Tiers Relate to Modules

- The **free tier** is the AI Navigator's quiz + summary — this is the
  acquisition funnel; it must stay genuinely useful unpaywalled or the rest
  of the funnel never fills.
- The **one-time report fee** is the first monetization moment, immediately
  after a student sees a promising but incomplete result — highest-intent
  purchase point.
- The **subscription** is where most recurring revenue should come from
  once Career Arena + Shadow Alley exist; it should be pitched only after
  those modules give it real content to unlock (don't sell a subscription
  against a report-only product).
- **Kits** are a discretionary, higher-ticket add-on for STEM/creative
  tracks — margin comes from bundling a tutorial unlock the student
  otherwise can't get standalone.
- **School licenses** are the highest-value, lowest-volume line — sell only
  once there's a populated, demoable student portfolio experience (see
  [schedule.md](./schedule.md) M6 ordering rationale).
- **WhatsApp micro-billing** exists to monetize the offline/rural segment
  without requiring a smartphone or M-Pesa app — deliberately the lowest
  price point in the model.

## Payment Rails

- **M-Pesa Daraja (STK Push)** is the primary rail for report unlocks,
  subscriptions, and kit orders — matches the target market's dominant
  payment method. See `payments` / `subscriptions` in
  [database.md](./database.md) and the planned `initiateMpesaPayment` /
  `mpesaCallback` functions in [api.md](./api.md).
- **Airtime billing** (via the WhatsApp/telco provider) is a separate,
  lower-friction rail reserved for the KES 10 story-path micro-purchases —
  do not force M-Pesa for these, it defeats the low-friction purpose.

## Notes for Implementation

- All `payments` rows must be marked "success" only from the server-side
  Daraja callback handler, never from a client call — see the RLS/write
  guidance in [database.md](./database.md) §2.
- Subscription status gates content via `subscriptions.status` +
  `current_period_end`, checked server-side on every request to premium
  content, not cached client-side as the source of truth.
