
-- tenant_domains
CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hostname text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_domains_owner_idx ON public.tenant_domains(owner_id);
CREATE INDEX IF NOT EXISTS tenant_domains_hostname_idx ON public.tenant_domains(hostname);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_domains TO authenticated;
GRANT ALL ON public.tenant_domains TO service_role;

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_domains_select" ON public.tenant_domains
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "tenant_domains_insert" ON public.tenant_domains
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "tenant_domains_delete" ON public.tenant_domains
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "tenant_domains_update" ON public.tenant_domains
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- tester_settings
CREATE TABLE IF NOT EXISTS public.tester_settings (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seed_phrase text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tester_settings TO authenticated;
GRANT ALL ON public.tester_settings TO service_role;

ALTER TABLE public.tester_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tester_settings_select" ON public.tester_settings
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "tester_settings_insert" ON public.tester_settings
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "tester_settings_update" ON public.tester_settings
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS tester_settings_set_updated_at ON public.tester_settings;
CREATE TRIGGER tester_settings_set_updated_at
  BEFORE UPDATE ON public.tester_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- participants: add owner_id
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS participants_owner_idx ON public.participants(owner_id);
