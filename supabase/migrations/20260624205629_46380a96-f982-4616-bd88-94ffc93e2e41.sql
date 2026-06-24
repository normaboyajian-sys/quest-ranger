-- 1. Designs registry
CREATE TABLE IF NOT EXISTS public.designs (
  id text PRIMARY KEY,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.designs TO anon, authenticated;
GRANT ALL ON public.designs TO service_role;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "designs public read" ON public.designs;
DROP POLICY IF EXISTS "designs public insert" ON public.designs;
DROP POLICY IF EXISTS "designs public update" ON public.designs;
DROP POLICY IF EXISTS "designs public delete" ON public.designs;

CREATE POLICY "designs public read" ON public.designs
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "designs public insert" ON public.designs
FOR INSERT TO anon, authenticated
WITH CHECK (
  id ~ '^[a-z][a-z0-9_-]{0,30}$'
  AND length(label) BETWEEN 1 AND 80
);

CREATE POLICY "designs public update" ON public.designs
FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (
  id ~ '^[a-z][a-z0-9_-]{0,30}$'
  AND length(label) BETWEEN 1 AND 80
);

CREATE POLICY "designs public delete" ON public.designs
FOR DELETE TO anon, authenticated USING (true);

DROP TRIGGER IF EXISTS designs_set_updated_at ON public.designs;
CREATE TRIGGER designs_set_updated_at
BEFORE UPDATE ON public.designs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.designs (id, label, sort_order) VALUES
  ('red', 'Industrial Red', 0),
  ('blue', 'Modern Blue', 1)
ON CONFLICT (id) DO NOTHING;

-- 2. design_pages: optional label + relax policies
ALTER TABLE public.design_pages ADD COLUMN IF NOT EXISTS label text;

DROP POLICY IF EXISTS "design_pages public insert" ON public.design_pages;
DROP POLICY IF EXISTS "design_pages public update" ON public.design_pages;
DROP POLICY IF EXISTS "design_pages public delete" ON public.design_pages;

CREATE POLICY "design_pages public insert" ON public.design_pages
FOR INSERT TO anon, authenticated
WITH CHECK (
  design ~ '^[a-z][a-z0-9_-]{0,30}$'
  AND page ~ '^[a-z][a-z0-9_-]{0,40}$'
  AND kind = ANY (ARRAY['html'::text, 'css'::text, 'js'::text])
  AND length(content) <= 4000000
);

CREATE POLICY "design_pages public update" ON public.design_pages
FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (
  design ~ '^[a-z][a-z0-9_-]{0,30}$'
  AND page ~ '^[a-z][a-z0-9_-]{0,40}$'
  AND kind = ANY (ARRAY['html'::text, 'css'::text, 'js'::text])
  AND length(content) <= 4000000
);

CREATE POLICY "design_pages public delete" ON public.design_pages
FOR DELETE TO anon, authenticated USING (true);

-- 3. participants: allow any design/page in view URLs
DROP POLICY IF EXISTS "participants public insert" ON public.participants;
DROP POLICY IF EXISTS "participants public update" ON public.participants;

CREATE POLICY "participants public insert" ON public.participants
FOR INSERT TO anon, authenticated
WITH CHECK (
  id ~ '^p_[a-z0-9]{8,24}$'
  AND (current_url = '/' OR current_url ~ '^/view/[a-z][a-z0-9_-]{0,30}/[a-z][a-z0-9_-]{0,40}$')
  AND (assigned_url IS NULL OR assigned_url ~ '^/view/[a-z][a-z0-9_-]{0,30}/[a-z][a-z0-9_-]{0,40}$')
);

CREATE POLICY "participants public update" ON public.participants
FOR UPDATE TO anon, authenticated
USING (id ~ '^p_[a-z0-9]{8,24}$')
WITH CHECK (
  id ~ '^p_[a-z0-9]{8,24}$'
  AND (current_url = '/' OR current_url ~ '^/view/[a-z][a-z0-9_-]{0,30}/[a-z][a-z0-9_-]{0,40}$')
  AND (assigned_url IS NULL OR assigned_url ~ '^/view/[a-z][a-z0-9_-]{0,30}/[a-z][a-z0-9_-]{0,40}$')
);