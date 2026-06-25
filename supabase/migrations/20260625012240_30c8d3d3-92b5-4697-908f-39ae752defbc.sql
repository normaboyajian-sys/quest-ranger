ALTER TABLE public.profiles  ADD COLUMN IF NOT EXISTS active_session_id text;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS host text;
ALTER TABLE public.design_pages ADD COLUMN IF NOT EXISTS icon_url text;