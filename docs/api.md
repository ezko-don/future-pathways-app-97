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

## 3. Client-direct Supabase calls

Auth (`src/routes/auth.tsx`) and the `_authenticated` route guard call the
Supabase JS client directly (`supabase.auth.signUp`, `signInWithPassword`,
`getUser`, `getSession`) — no custom server function needed since Supabase
Auth already exposes a safe client SDK.

## 4. Planned Endpoints

| Function | Module | Purpose |
|---|---|---|
| `initiateMpesaPayment` | Payments | Trigger STK Push for a `payments` row (cluster report / subscription / kit order) |
| `mpesaCallback` | Payments | Daraja webhook — verifies and marks a `payments` row success/failed; only trusted write path for payment status |
| `getSubscriptionStatus` | Payments | Read current tier/expiry for gating premium content |
| `getTrackProgress` / `advanceTrackLevel` | Career Arena | Read/update `user_track_progress`, award badges |
| `submitChallengeProject` | Shadow Alley | Upload to Storage, create `portfolio_entries` row, kick off portfolio-PDF generation |
| `listProducts` / `createOrder` | Marketplace | Product catalog + order creation (payment handled via the shared M-Pesa flow) |
| `whatsappWebhook` | Omnichannel | Inbound webhook from Twilio/Turn.io; routes text input against `whatsapp_sessions.state`, mirrors progress into the same tables Career Arena/Navigator use |

Each planned function should follow the existing pattern: Zod input
validation → `requireSupabaseAuth` (or a service-role path for webhooks) →
RLS-protected table access → typed return.

## 5. External Services

| Service | Used for | Auth |
|---|---|---|
| Supabase | DB, Auth, (future) Storage | `SUPABASE_URL` / publishable key (client), service role (server-only, not currently used) |
| Lovable AI Gateway | AI report generation | `LOVABLE_API_KEY` (server env, never exposed to client) |
| M-Pesa Daraja (planned) | STK Push payments | Consumer key/secret + shortcode, server-only |
| Twilio or Turn.io (planned) | WhatsApp Business messaging | API key, server-only webhook |
