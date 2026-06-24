DROP POLICY IF EXISTS "design_pages public insert" ON public.design_pages;
DROP POLICY IF EXISTS "design_pages public update" ON public.design_pages;

CREATE POLICY "design_pages public insert" ON public.design_pages
FOR INSERT TO anon, authenticated
WITH CHECK (
  design = ANY (ARRAY['red'::text,'blue'::text])
  AND page = ANY (ARRAY['home'::text,'contact'::text,'shared'::text])
  AND kind = ANY (ARRAY['html'::text,'css'::text,'js'::text])
  AND length(content) <= 4000000
);

CREATE POLICY "design_pages public update" ON public.design_pages
FOR UPDATE TO anon, authenticated
USING (
  design = ANY (ARRAY['red'::text,'blue'::text])
  AND page = ANY (ARRAY['home'::text,'contact'::text,'shared'::text])
  AND kind = ANY (ARRAY['html'::text,'css'::text,'js'::text])
)
WITH CHECK (
  design = ANY (ARRAY['red'::text,'blue'::text])
  AND page = ANY (ARRAY['home'::text,'contact'::text,'shared'::text])
  AND kind = ANY (ARRAY['html'::text,'css'::text,'js'::text])
  AND length(content) <= 4000000
);