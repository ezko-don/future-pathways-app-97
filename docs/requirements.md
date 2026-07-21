# Requirements — KaziFuture

## 1. Problem Statement

Kenya's CBC (Competency-Based Curriculum) requires students to choose a
Senior School pathway (STEM, Social Sciences, or Arts & Sports Science) based
on demonstrated competencies rather than exam scores alone. Most students and
parents lack:

- Structured, personalized guidance on which pathway fits a learner's talents
- Real-world exposure to what careers in each pathway actually look like
- Hands-on practice with the skills those careers require
- Portfolio evidence to show CBC teachers/assessors
- Access to any of the above without a laptop or reliable internet

KaziFuture addresses this with five integrated modules delivered through one
account system, reachable from both a web/mobile app and WhatsApp/SMS.

## 2. Personas

| Persona | Description | Primary needs |
|---|---|---|
| **Student** | CBC junior/senior school learner, 12–18 | Discover pathway fit, practice skills, build a portfolio, have fun |
| **Parent** | Pays for premium features, tracks progress | Trustworthy guidance, clear pricing, evidence of progress |
| **School / Teacher (B2B)** | Tracks CBC portfolio evidence for a cohort | Bulk visibility into student pathway data and portfolio entries |
| **Rural / low-bandwidth user** | No smartphone/laptop or unreliable data | Full core experience over SMS/WhatsApp text |

## 3. Module Scope

### 3.1 AI Navigator (built — MVP)
- Diagnostic quiz capturing interests/strengths
- AI-generated report: top cluster, summary, strengths, 3 ranked CBC
  pathways with Kenyan-career examples, next steps
- Free tier: summary view in-app
- Paid tier: full report as downloadable PDF (M-Pesa STK Push, one-time fee)
- Result history per user

### 3.2 Career Arena (planned)
- Gamified "Day-in-the-Life" simulations per career (e.g., build a simulated
  M-Pesa clone for software engineering; manage a ward budget for nursing)
- Progress tracked as levels/badges tied to the student's account
- Launch scope: 2 career tracks (Software Engineering, Agribusiness)

### 3.3 Shadow Alley (planned)
- Unlocked after completing a simulation track
- Interactive video "masterclasses" with real professionals
- End-of-video "Challenge Project" with file/image upload
- Auto-generated CBC Learner Portfolio Entry (printable/shareable) from a
  completed challenge

### 3.4 Marketplace (planned)
- E-commerce tab for physical project kits (e.g., IoT/Arduino box, fashion
  kit, agri-tech kit)
- Purchase unlocks a matching premium tutorial module in-app
- Delivery/fulfillment tracking

### 3.5 Omnichannel / WhatsApp Hub (planned)
- WhatsApp Business number running a text-based "Choose Your Own Adventure"
  version of the Career Arena
- Progress keyed by phone number, synced to the same account/database used
  by the web app
- Optional micro-billed premium story paths via airtime billing

## 4. Functional Requirements

| ID | Requirement | Module | Status |
|---|---|---|---|
| FR-1 | User can sign up/sign in as parent or student | Core | ✅ |
| FR-2 | User can take a career interest quiz | AI Navigator | ✅ |
| FR-3 | System generates an AI pathway report from quiz answers | AI Navigator | ✅ |
| FR-4 | User can view past quiz results (history) | AI Navigator | ✅ |
| FR-5 | User can export a report as PDF | AI Navigator | ✅ |
| FR-6 | Full report is paywalled behind M-Pesa payment | AI Navigator | ⬜ |
| FR-7 | Student can play a gamified career simulation | Career Arena | ⬜ |
| FR-8 | Student earns badges for completed simulation tracks | Career Arena | ⬜ |
| FR-9 | Student can watch a shadowing video unlocked by simulation completion | Shadow Alley | ⬜ |
| FR-10 | Student can submit a challenge project and receive a portfolio entry | Shadow Alley | ⬜ |
| FR-11 | Parent can purchase a physical kit | Marketplace | ⬜ |
| FR-12 | Kit purchase unlocks a matching in-app tutorial module | Marketplace | ⬜ |
| FR-13 | User can interact with the platform via WhatsApp text menu | Omnichannel | ⬜ |
| FR-14 | WhatsApp progress syncs to the same account on web login | Omnichannel | ⬜ |
| FR-15 | School admin can view aggregated student portfolio data (B2B) | Core (future) | ⬜ |

## 5. Non-Functional Requirements

- **Security**: Row Level Security on all user data tables; role table
  separated from profile table to prevent privilege escalation (already
  implemented — see [database.md](./database.md)).
- **Low-bandwidth resilience**: core value (pathway guidance) must be
  reachable without a broadband connection — WhatsApp/SMS channel is not
  optional for the target market.
- **Localization**: content must be Kenya-specific (CBC terminology, local
  employers, KES pricing, M-Pesa as the primary payment rail).
- **Performance**: AI report generation should return within ~10s; failures
  (rate limit / no credits) must degrade gracefully with a clear message
  (already handled in `quiz.functions.ts`).
- **Data integrity**: quiz answers and generated reports are persisted so a
  user never loses a result (already implemented via `quiz_results`).
- **Privacy**: minors' data — collect only what's needed (name, quiz
  answers, role); no unnecessary PII.

## 6. Out of Scope (for now)

- Native mobile apps (web-first, responsive; WhatsApp covers the offline gap)
- Full LMS/curriculum delivery (KaziFuture guides and evidences, it does not
  replace school teaching)
- Payment rails other than M-Pesa at launch
