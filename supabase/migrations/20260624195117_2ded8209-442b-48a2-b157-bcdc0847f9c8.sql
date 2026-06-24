CREATE TABLE public.participants (
  id TEXT PRIMARY KEY,
  current_url TEXT NOT NULL DEFAULT '/',
  assigned_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  online BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO anon, authenticated;
GRANT ALL ON public.participants TO service_role;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants public read" ON public.participants
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "participants public insert" ON public.participants
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "participants public update" ON public.participants
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "participants public delete" ON public.participants
  FOR DELETE TO anon, authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER TABLE public.participants REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_participants_updated_at
BEFORE UPDATE ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();