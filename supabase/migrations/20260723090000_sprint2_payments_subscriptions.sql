
-- Sprint 2 — Monetize the Navigator: payments + subscriptions

CREATE TYPE public.payment_purpose AS ENUM ('cluster_report', 'subscription', 'kit_order');
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE public.subscription_tier AS ENUM ('monthly', 'annual');
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled');

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_result_id uuid REFERENCES public.quiz_results(id) ON DELETE SET NULL,
  purpose public.payment_purpose NOT NULL,
  amount_kes integer NOT NULL,
  phone_number text NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  mpesa_receipt text,
  merchant_request_id text,
  checkout_request_id text,
  result_desc text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_user_id_idx ON public.payments (user_id);
CREATE INDEX payments_quiz_result_id_idx ON public.payments (quiz_result_id);
CREATE INDEX payments_checkout_request_id_idx ON public.payments (checkout_request_id);

-- Writes only ever happen via the service role (server functions + the M-Pesa
-- callback webhook) so a client can never fabricate or flip its own payment status.
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.subscription_tier NOT NULL,
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_end timestamptz NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_user_id_status_idx ON public.subscriptions (user_id, status);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
