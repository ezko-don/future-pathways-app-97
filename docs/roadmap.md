# Roadmap — KaziFuture Full Vision

This document is the product vision behind the sprint plan: the full
"super app" merging five modules into one CBC career-readiness platform.
Use [sprint-plan.md](./sprint-plan.md) for execution order and
[requirements.md](./requirements.md) for detailed acceptance criteria.

## The Merged Experience

**1. AI Navigator (entry point) — built**
A 15-minute diagnostic quiz maps a student's talents, CBC junior-school
assessments, and interests to three ranked Senior School pathways (e.g.
STEM: Engineering, Arts: Graphic Design), plus a basic timeline. The full
30-page CBC Alignment & University Cluster Report is a paid unlock (M-Pesa).

**2. Career Arena (the core loop) — planned**
Based on the AI recommendation, the student enters a dashboard of
interactive, gamified "Day-in-the-Life" simulations — e.g. arranging code
blocks to build a simulated M-Pesa clone (software engineering), or managing
a virtual ward budget and patient intake simulator (nursing). Completing a
track earns digital badges and unlocks the next tier.

**3. Shadow Alley (real-world proof) — planned**
Completing a simulation unlocks premium, interactive "Behind-the-Scenes"
masterclass videos filmed with real professionals (e.g. at Safaricom,
KenGen, local creative studios). Each video ends with a "Challenge Project"
(e.g. "Design a logo for a local kibanda"). The student's uploaded solution
auto-generates a certified CBC Learner Portfolio Entry they can present to
their teachers.

**4. KaziFuture Marketplace (physical extension) — planned**
For STEM/creative tracks needing physical skills, an integrated e-commerce
tab lets parents buy physical project boxes (e.g. an IoT Automation Box).
Buying a kit unlocks a matching premium module with step-by-step tutorials
for the physical hardware received in the mail.

**5. WhatsApp / SMS Hub (inclusivity net) — planned**
For users without laptops or reliable internet, texting "START" to the
official WhatsApp Business number activates a "Choose Your Own Adventure"
text version of the Career Arena. Progress syncs to the same database via
phone number — logging in later on a computer preserves points and AI
career profiles.

## System Diagram

```
                     [ KaziFuture Core Engine ]
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  [1. AI Navigator]        [2. Career Arena]        [3. Shadow Alley]
  Pathways & Cluster       Gamified Simulation      Virtual Internships
  Predictor (Premium PDF)  & Task Quests (SaaS)     & Portfolio Evidence
         │                                                   │
         └─────────────────────────┬─────────────────────────┘
                                   ▼
                       [4. Omnichannel Delivery]
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
         { Physical Kits }                 { WhatsApp Bot }
         IoT, Fashion, Agri-tech           Lite text quests for
         ordered via E-shop                offline/rural users
```

See [architecture.md](./architecture.md) for how this maps to the actual
codebase, and [database.md](./database.md) for the proposed schema per
module.

## Why This Is One Product, Not Five

The five modules solve the CBC career-readiness problem holistically only
because they share state:

- Gamification (Arena) gives students a reason to keep coming back.
- Real-world validation (Shadow Alley) gives what they did *meaning*
  (portfolio evidence a teacher accepts).
- The AI (Navigator) tells them *where* to start.
- Physical kits (Marketplace) give the STEM/creative tracks a hands-on
  component simulations alone can't.
- WhatsApp (Hub) ensures the whole loop is reachable by students who can't
  afford a laptop or data bundle — without it, the platform only serves
  urban private-school students and misses the majority of the CBC cohort.

Building any one module in isolation is straightforward; the hard part —
and the point of the [database.md](./database.md) identity/progress model —
is keeping one student = one profile = one progress record across all five,
regardless of which channel (web or WhatsApp) they used.

## Explicit Non-Goals

- Not a replacement for school curriculum delivery — KaziFuture guides
  pathway choice and evidences competency; it doesn't teach the syllabus.
- Not launching with payment rails beyond M-Pesa.
- Not launching native mobile apps before validating whether responsive
  web + WhatsApp already covers the target market (see Sprint 3 exit
  criteria in [sprint-plan.md](./sprint-plan.md)).
