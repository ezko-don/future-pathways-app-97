# Database — KaziFuture

Database: Supabase Postgres. Migrations live in `supabase/migrations/` and
are the source of truth — this document explains and indexes them, and
proposes schema for not-yet-built modules.

## 1. Current Schema (implemented)

### `public.app_role` (enum)
`'parent' | 'student' | 'admin'`

### `public.profiles`
One row per auth user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id`, cascade delete |
| `full_name` | text | |
| `avatar_url` | text | |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | auto-updated via `set_updated_at` trigger |

RLS: owner-only `SELECT`/`INSERT`/`UPDATE` (`auth.uid() = id`).

### `public.user_roles`
Deliberately **separate** from `profiles` so a user can never grant
themselves a role by updating their own profile row (privilege-escalation
guard).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `user_id` | uuid FK → `auth.users.id`, cascade delete | |
| `role` | `app_role` | |
| `created_at` | timestamptz | |

Unique on `(user_id, role)`. RLS: owner-only `SELECT`. No client-side
`INSERT`/`UPDATE`/`DELETE` policy exists — roles are only ever written by the
`handle_new_user` trigger (`SECURITY DEFINER`), never directly by a client.

### `public.quiz_results`
One row per completed AI Navigator quiz submission.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → `auth.users.id`, cascade delete | |
| `answers` | jsonb | raw `{questionId, question, answer}[]` |
| `top_cluster` | text | |
| `summary` | text | |
| `strengths` | jsonb | string array |
| `pathways` | jsonb | array of `{title, cbc_track, why_fit, kenyan_careers[]}`, always length 3 |
| `next_steps` | jsonb | string array |
| `created_at` / `updated_at` | timestamptz | |

RLS: owner-only, full CRUD (`auth.uid() = user_id`).

### Shared functions/triggers
- `has_role(_user_id, _role)` — `SECURITY DEFINER`, `STABLE`; used to check
  roles without exposing `user_roles` to broader read access. Execute
  revoked from `PUBLIC`/`anon`.
- `set_updated_at()` — generic `updated_at` trigger, reused by `profiles`
  and `quiz_results`.
- `handle_new_user()` — `AFTER INSERT ON auth.users` trigger. Reads
  `raw_user_meta_data` (`full_name`/`name`, `avatar_url`, `role`) set at
  signup, creates the `profiles` row, and assigns the role (defaults to
  `student` if missing/invalid — `admin` can never be self-assigned via
  signup metadata). Execute revoked from `PUBLIC`/`anon`/`authenticated`.

### Entity relationship (current)

```
auth.users (Supabase managed)
   │ 1:1
   ▼
profiles ──────────────┐
   │ 1:N (via user_id)  │ 1:N (via user_id)
   ▼                    ▼
user_roles          quiz_results
```

## 2. Proposed Schema — Planned Modules

Not yet migrated. Documented here to align implementation before build.

### Payments (`subscriptions`, `payments`) — for FR-6
```
subscriptions
  id uuid PK
  user_id uuid FK -> auth.users
  tier text            -- 'free' | 'monthly' | 'termly'
  status text           -- 'active' | 'expired' | 'cancelled'
  current_period_end timestamptz
  created_at / updated_at

payments
  id uuid PK
  user_id uuid FK -> auth.users
  purpose text          -- 'cluster_report' | 'subscription' | 'kit_order'
  amount_kes integer
  mpesa_receipt text
  status text            -- 'pending' | 'success' | 'failed'
  created_at
```
RLS: owner-only read; writes only via a service-role server function that
handles the M-Pesa Daraja callback (never trust a client to mark its own
payment "success").

### Career Arena — for FR-7/FR-8
```
career_tracks
  id uuid PK
  slug text unique       -- 'software-engineering' | 'agribusiness'
  title text
  description text

track_levels
  id uuid PK
  track_id uuid FK -> career_tracks
  order_index int
  title text
  config jsonb            -- level-specific simulation config

user_track_progress
  id uuid PK
  user_id uuid FK -> auth.users
  track_id uuid FK -> career_tracks
  current_level_index int
  completed_at timestamptz nullable
  badges jsonb             -- earned badge slugs

unique (user_id, track_id)
```
RLS: owner-only on `user_track_progress`; `career_tracks`/`track_levels`
are public read (reference/content data, not user data).

### Shadow Alley — for FR-9/FR-10
```
shadow_videos
  id uuid PK
  track_id uuid FK -> career_tracks nullable
  title text
  video_url text
  challenge_prompt text
  unlock_requires_track_id uuid FK -> career_tracks nullable

portfolio_entries
  id uuid PK
  user_id uuid FK -> auth.users
  shadow_video_id uuid FK -> shadow_videos
  submission_url text       -- Supabase Storage object path
  status text                -- 'submitted' | 'reviewed' | 'certified'
  generated_pdf_url text nullable
  created_at
```
RLS: owner-only on `portfolio_entries`; submission files in a private
Supabase Storage bucket with owner-only policies.

### Marketplace — for FR-11/FR-12
```
products
  id uuid PK
  sku text unique
  title text
  price_kes integer
  unlocks_track_id uuid FK -> career_tracks nullable

orders
  id uuid PK
  user_id uuid FK -> auth.users
  product_id uuid FK -> products
  status text            -- 'pending' | 'paid' | 'shipped' | 'delivered'
  payment_id uuid FK -> payments nullable
  created_at
```
RLS: owner-only read/insert on `orders`; status transitions via
service-role server function only.

### Omnichannel / WhatsApp — for FR-13/FR-14
```
whatsapp_identities
  id uuid PK
  user_id uuid FK -> auth.users nullable   -- null until first web login/merge
  phone_number text unique
  created_at

whatsapp_sessions
  id uuid PK
  whatsapp_identity_id uuid FK -> whatsapp_identities
  state jsonb               -- current position in the text quest flow
  updated_at
```
Merge rule: on web signup/login, if the user supplies/verifies a phone
number matching an existing `whatsapp_identities.phone_number` with a null
`user_id`, attach it — this is what makes FR-14 ("progress syncs") work.

## 3. Conventions

- Every user-owned table: `user_id uuid NOT NULL REFERENCES auth.users(id)
  ON DELETE CASCADE`, RLS enabled, `auth.uid() = user_id` policy.
- Every table gets `created_at timestamptz NOT NULL DEFAULT now()`; add
  `updated_at` + `set_updated_at` trigger only if the row is mutated after
  creation.
- Money is stored as integer **KES** (no floating point), matching the
  pricing in [revenue-model.md](./revenue-model.md).
- No table grants broad `INSERT`/`UPDATE`/`DELETE` to `authenticated` when a
  privileged/service-role write is required (roles, payments, order status)
  — mirrors the existing `user_roles` pattern.
