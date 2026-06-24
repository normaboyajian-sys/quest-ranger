
DROP POLICY IF EXISTS "participants public insert" ON public.participants;
DROP POLICY IF EXISTS "participants public update" ON public.participants;

CREATE POLICY "participants public insert" ON public.participants
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    id ~ '^p_[a-z0-9]{8,24}$'
    AND (current_url = '/' OR current_url ~ '^/[a-z][a-z0-9_-]{0,30}/[a-z][a-z0-9_-]{0,40}$')
    AND (assigned_url IS NULL OR assigned_url ~ '^/[a-z][a-z0-9_-]{0,30}/[a-z][a-z0-9_-]{0,40}$')
  );

CREATE POLICY "participants public update" ON public.participants
  FOR UPDATE TO anon, authenticated
  USING (id ~ '^p_[a-z0-9]{8,24}$')
  WITH CHECK (
    id ~ '^p_[a-z0-9]{8,24}$'
    AND (current_url = '/' OR current_url ~ '^/[a-z][a-z0-9_-]{0,30}/[a-z][a-z0-9_-]{0,40}$')
    AND (assigned_url IS NULL OR assigned_url ~ '^/[a-z][a-z0-9_-]{0,30}/[a-z][a-z0-9_-]{0,40}$')
  );
