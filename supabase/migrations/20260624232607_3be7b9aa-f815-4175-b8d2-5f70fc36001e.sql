ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS ip text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings read all" ON public.app_settings;
CREATE POLICY "app_settings read all" ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_settings write all" ON public.app_settings;
CREATE POLICY "app_settings write all" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.app_settings (key, value)
VALUES ('block_bots', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;