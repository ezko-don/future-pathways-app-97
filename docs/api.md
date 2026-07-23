# API — KaziFuture

There is no standalone REST/GraphQL API. Server logic is implemented as
TanStack Start **server functions** (`createServerFn`) colocated in
`src/lib/*.functions.ts`, called directly from route components like RPC
calls, and executed on the server (never shipping secrets to the client).

## 1. Auth boundary

All authenticated server functions run through the `requireSupabaseAuth`
middleware (`src/integrations/supabase/auth-middleware.ts`), which verifies
the Supabase session **server-side** and injects `context.supabase` (a
server-scoped client) and `context.userId`. This is the real security
boundary — the client-side redirect in `_authenticated/route.tsx` is only a
UX convenience, not a guard against a crafted request.

## 2. Current Endpoints (server functions)

All in `src/lib/quiz.functions.ts`.

### `submitQuiz`
- **Method**: POST
- **Auth**: required
- **Input**: `{ answers: { questionId: string; question: string; answer: string }[] }` (min 1)
- **Behavior**:
  1. Builds a CBC-pathway prompt from the answers.
  2. Calls Lovable AI Gateway (`google/gemini-2.5-flash`) for a structured
     JSON report.
  3. Validates the response against `ReportSchema` (Zod) — exactly 3
     pathways, 3–6 strengths, 3–6 next steps.
  4. Inserts a row into `quiz_results`.
- **Output**: `{ id: string; report: QuizReport }`
- **Errors**: `Missing LOVABLE_API_KEY` (config), `429` → rate limit
  message, `402` → credits exhausted message, invalid/empty AI response →
  generic failure.

### `getLatestQuizResult`
- **Method**: GET
- **Auth**: required
- **Output**: most recent `quiz_results` row for the caller (or `null`),
  columns: `id, top_cluster, summary, strengths, pathways, next_steps,
  created_at`.

### `listQuizResults`
- **Method**: GET
- **Auth**: required
- **Output**: all `quiz_results` rows for the caller, newest first.

All in `src/lib/payments.functions.ts`.

### `initiateClusterReportUnlock`
- **Method**: POST
- **Auth**: required
- **Input**: `{ quizResultId: string (uuid); phoneNumber: string }`
- **Behavior**:
  1. Confirms the caller owns `quizResultId`.
  2. Rejects if a successful `cluster_report` payment already exists for it.
  3. Normalizes the phone number to `2547XXXXXXXX` (`src/lib/mpesa.server.ts`).
  4. Inserts a `pending` `payments` row (service role — see [database.md](./database.md)).
  5. Calls Daraja STK Push; on success, stores `merchant_request_id` /
     `checkout_request_id` on the row. On failure, marks the row `failed`
     with `result_desc` and rethrows.
- **Output**: `{ paymentId: string }`
- **Errors**: `Quiz result not found`, `This report is already unlocked.`,
  invalid phone number, missing `MPESA_*` env vars, Daraja API errors.

### `getPaymentStatus`
- **Method**: GET
- **Auth**: required
- **Input**: `{ paymentId: string (uuid) }`
- **Output**: `{ id, status, mpesa_receipt, result_desc }` for a payment
  owned by the caller. Intended to be polled client-side after initiating
  STK Push, until `status` leaves `'pending'`.

### `getReportEntitlement`
- **Method**: GET
- **Auth**: required
- **Input**: `{ quizResultId: string (uuid) }`
- **Output**: `{ unlocked: boolean; reason: 'payment' | 'subscription' | null }`
  — `true` if a successful `cluster_report` payment exists for that quiz
  result, or the caller has an active, unexpired subscription.

## 3. Raw HTTP routes (non-RPC)

TanStack Start in this project has no file-based API-route mechanism, so
the one raw webhook endpoint is wired into the custom server entry
(`src/server.ts`), which intercepts matching requests before falling
through to the normal SSR/router handling.

### `POST /api/mpesa/callback/:secret`
- Handled by `src/lib/mpesa-callback.server.ts` (`handleMpesaCallback`).
- `:secret` must equal `MPESA_CALLBACK_SECRET`; on mismatch, responds `404`
  without touching the database. Daraja has no callback signature/HMAC, so
  this obscure path segment is the only guard — combined with the fact that
  `checkout_request_id` (the value used to match a payment row) is never
  returned to any client-facing server function, so knowing the secret
  alone isn't enough to forge a specific payment's success.
- Parses the Daraja `stkCallback` payload, updates the matching `payments`
  row's `status` (`success` if `ResultCode === 0`, else `failed`),
  `mpesa_receipt`, and `result_desc`.
- Always responds `200 { ResultCode: 0, ResultDesc: "Accepted" }`, even on
  internal failure, since Daraja retries on anything else.

## 4. Client-direct Supabase calls

Auth (`src/routes/auth.tsx`) and the `_authenticated` route guard call the
Supabase JS client directly (`supabase.auth.signUp`, `signInWithPassword`,
`getUser`, `getSession`) — no custom server function needed since Supabase
Auth already exposes a safe client SDK.

## 5. Planned Endpoints

| Function | Module | Purpose |
|---|---|---|
| `getSubscriptionStatus` / `initiateSubscriptionPurchase` | Payments | Recurring subscription purchase + status — schema exists (`subscriptions`), purchase flow not yet built (Sprint 2 only covers the one-time cluster report) |
| `getTrackProgress` / `advanceTrackLevel` | Career Arena | Read/update `user_track_progress`, award badges |
| `submitChallengeProject` | Shadow Alley | Upload to Storage, create `portfolio_entries` row, kick off portfolio-PDF generation |
| `listProducts` / `createOrder` | Marketplace | Product catalog + order creation (payment handled via the shared M-Pesa flow) |
| `whatsappWebhook` | Omnichannel | Inbound webhook from Twilio/Turn.io; routes text input against `whatsapp_sessions.state`, mirrors progress into the same tables Career Arena/Navigator use |

Each planned function should follow the existing pattern: Zod input
validation → `requireSupabaseAuth` (or a service-role path for webhooks) →
RLS-protected table access → typed return.

## 6. External Services

| Service | Used for | Auth |
|---|---|---|
| Supabase | DB, Auth, (future) Storage | `SUPABASE_URL` / publishable key (client), service role (`SUPABASE_SERVICE_ROLE_KEY`, server-only — used by `payments.functions.ts` and the M-Pesa callback) |
| Lovable AI Gateway | AI report generation | `LOVABLE_API_KEY` (server env, never exposed to client) |
| M-Pesa Daraja | STK Push payments | `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_SHORTCODE` / `MPESA_PASSKEY` / `MPESA_CALLBACK_BASE_URL` / `MPESA_CALLBACK_SECRET` / `MPESA_ENV` (`sandbox`\|`production`) — server-only, **not yet configured**; none of these are committed to `.env`, they must be set out-of-band the same way `LOVABLE_API_KEY` is. Until they're set, `initiateClusterReportUnlock` fails fast with a clear "Missing `MPESA_*`" error rather than silently no-opping |
| Twilio or Turn.io (planned) | WhatsApp Business messaging | API key, server-only webhook |
