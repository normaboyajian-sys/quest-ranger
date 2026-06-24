
CREATE TABLE public.design_pages (
  design TEXT NOT NULL,
  page TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (design, page, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.design_pages TO anon, authenticated;
GRANT ALL ON public.design_pages TO service_role;
ALTER TABLE public.design_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "design_pages public read" ON public.design_pages
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "design_pages public insert" ON public.design_pages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "design_pages public update" ON public.design_pages
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.design_pages;
ALTER TABLE public.design_pages REPLICA IDENTITY FULL;
