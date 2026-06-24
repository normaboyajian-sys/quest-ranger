ALTER TABLE public.design_pages REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.design_pages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;