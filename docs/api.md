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
  1. Calls `generateQuizReport` (`src/lib/ai-report.server.ts`, shared with
     the WhatsApp text quiz) — builds a CBC-pathway prompt, calls Lovable AI
     Gateway (`google/gemini-2.5-flash`), validates the response against
     `ReportSchema` (Zod) — exactly 3 pathways, 3–6 strengths, 3–6 next steps.
  2. Inserts a row into `quiz_results`.
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

In `src/lib/whatsapp.functions.ts`.

### `mergeWhatsappIdentity`
- **Method**: POST
- **Auth**: required
- **Input**: `{ phoneNumber: string }`
- **Behavior**: normalizes the phone number, finds the matching
  `whatsapp_identities` row (error if none — nothing has texted "START" from
  that number yet), rejects if it's already linked to a *different* account,
  otherwise sets its `user_id` to the caller and backfills `user_id` on any
  `quiz_results` rows with that `whatsapp_identity_id` and a null `user_id`.
  User-initiated (a "Link your WhatsApp number" input on the dashboard)
  rather than automatic on login, since this app never collects a phone
  number at signup.
- **Output**: `{ linked: true; mergedReportCount: number }`
- **Errors**: `No WhatsApp activity found for that number...`, `That
  WhatsApp number is already linked to a different account.`, invalid
  phone number.

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

### `POST /api/whatsapp/webhook/:secret`
- Handled by `src/lib/whatsapp-webhook.server.ts` (`handleWhatsappWebhook`).
- `:secret` must equal `WHATSAPP_CALLBACK_SECRET`; on mismatch, responds
  `404`. Unlike Daraja, Twilio *does* sign its webhooks — whenever
  `TWILIO_AUTH_TOKEN` is configured, the `X-Twilio-Signature` header is also
  verified (`src/lib/twilio.server.ts`, HMAC-SHA1 per Twilio's documented
  algorithm) and a mismatch responds `403`. The secret path segment alone
  gates access before `TWILIO_AUTH_TOKEN` is set up.
- Parses the inbound form-encoded `From`/`Body` fields, looks up or creates
  a `whatsapp_identities` row for the phone number, and drives a small state
  machine stored in `whatsapp_sessions.state` (`{ step, answers,
  quizResultId? }`):
  - `"START"` (any case) resets state and sends question 1.
  - Mid-quiz, a reply is parsed as a `1`–`5` choice against the current
    question's options (from `src/lib/quiz-questions.ts`, shared with the
    web quiz); invalid replies re-send the same question.
  - After the last question, calls the same `generateQuizReport` used by
    `submitQuiz`, inserts a `quiz_results` row with `whatsapp_identity_id`
    set and `user_id` null, and replies with the top cluster + summary + a
    prompt to link the number on the web app. If generation fails, state
    stays "answers complete, no report yet" so the *next* incoming message
    retries generation rather than losing the answers.
  - Once a report exists, further messages get "you already have a report,
    text START to retake" until retaken.
- Always responds `200` with a TwiML `<Response><Message>...</Message></Response>`
  reply (Twilio's synchronous-reply convention), even on internal failure,
  for the same anti-retry-storm reason as the M-Pesa callback.

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

Each planned function should follow the existing pattern: Zod input
validation → `requireSupabaseAuth` (or a service-role path for webhooks) →
RLS-protected table access → typed return.

## 6. External Services

| Service | Used for | Auth |
|---|---|---|
| Supabase | DB, Auth, (future) Storage | `SUPABASE_URL` / publishable key (client), service role (`SUPABASE_SERVICE_ROLE_KEY`, server-only — used by `payments.functions.ts`, `whatsapp.functions.ts`, and the M-Pesa/WhatsApp callback webhooks) |
| Lovable AI Gateway | AI report generation | `LOVABLE_API_KEY` (server env, never exposed to client) |
| M-Pesa Daraja | STK Push payments | `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_SHORTCODE` / `MPESA_PASSKEY` / `MPESA_CALLBACK_BASE_URL` / `MPESA_CALLBACK_SECRET` / `MPESA_ENV` (`sandbox`\|`production`) — server-only, set out-of-band the same way `LOVABLE_API_KEY` is (never committed to `.env`). Missing any of these fails fast with a clear error rather than silently no-opping |
| Twilio (WhatsApp) | WhatsApp Business messaging (Sprint 3) | `TWILIO_AUTH_TOKEN` (signature verification) / `WHATSAPP_CALLBACK_SECRET` (path guard) — server-only, same convention as above. `TWILIO_ACCOUNT_SID` isn't needed by our code — only by Twilio's own console to route the webhook — since replies go out as a synchronous TwiML response rather than via Twilio's outbound REST API |
