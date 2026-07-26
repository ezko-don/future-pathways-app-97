CREATE TABLE public.guardian_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Guardian',
  name text,
  whatsapp text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guardian_contacts TO authenticated;
GRANT ALL ON public.guardian_contacts TO service_role;

ALTER TABLE public.guardian_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own guardian contacts"
  ON public.guardian_contacts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX guardian_contacts_user_idx ON public.guardian_contacts(user_id);

CREATE TRIGGER guardian_contacts_set_updated_at
  BEFORE UPDATE ON public.guardian_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();