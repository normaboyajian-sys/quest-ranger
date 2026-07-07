
ALTER TABLE public.tenant_domains
  ADD COLUMN IF NOT EXISTS dns_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ssl_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
