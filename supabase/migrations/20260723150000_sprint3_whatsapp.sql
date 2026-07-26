
-- Sprint 3 — WhatsApp extension: whatsapp_identities + whatsapp_sessions,
-- and quiz_results gains an anonymous-until-merged ownership path.

CREATE TABLE public.whatsapp_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX whatsapp_identities_user_id_idx ON public.whatsapp_identities (user_id);

-- Writes only ever happen via the service role (the inbound WhatsApp webhook
-- creates identities; the mergeWhatsappIdentity server function links one to
-- a signed-in user) — mirrors the payments/user_roles privilege-escalation guard.
GRANT SELECT ON public.whatsapp_identities TO authenticated;
GRANT ALL ON public.whatsapp_identities TO service_role;
ALTER TABLE public.whatsapp_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own linked WhatsApp identity" ON public.whatsapp_identities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_identity_id uuid NOT NULL REFERENCES public.whatsapp_identities(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (whatsapp_identity_id)
);

-- Pure bot-internal state — no client ever needs to read or write this
-- directly, so it gets zero grants to authenticated/anon at all.
GRANT ALL ON public.whatsapp_sessions TO service_role;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER whatsapp_sessions_set_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- A quiz attempt can now originate anonymously from WhatsApp (no auth.users
-- row yet) and gets attached to a whatsapp_identities row instead; it's
-- backfilled to user_id once/if that phone number is linked to an account.
ALTER TABLE public.quiz_results ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.quiz_results
  ADD COLUMN whatsapp_identity_id uuid REFERENCES public.whatsapp_identities(id) ON DELETE SET NULL;
ALTER TABLE public.quiz_results
  ADD CONSTRAINT quiz_results_owner_check
  CHECK (user_id IS NOT NULL OR whatsapp_identity_id IS NOT NULL);

CREATE INDEX quiz_results_whatsapp_identity_id_idx ON public.quiz_results (whatsapp_identity_id);

-- Existing RLS policy is `auth.uid() = user_id`, which already evaluates to
-- false (not an error) for rows with a NULL user_id — anonymous WhatsApp
-- rows stay invisible to every authenticated client until merge sets user_id.
