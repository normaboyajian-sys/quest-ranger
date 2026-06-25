
-- 1. Hidden schema for SECURITY DEFINER helpers (not exposed to PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Drop policies that reference public.has_role so we can move the function
DROP POLICY IF EXISTS "admins see all profiles" ON public.profiles;

-- 3. Move SECURITY DEFINER helpers out of the public (PostgREST-exposed) schema
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.subscription_active(uuid) SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;

-- Recreate subscription_active so it references the relocated has_role
CREATE OR REPLACE FUNCTION private.subscription_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(_user_id, 'admin')
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = _user_id
          AND subscription_until IS NOT NULL
          AND subscription_until > now()
      )
$$;

-- Lock down EXECUTE on private functions
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.subscription_active(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.subscription_active(uuid) TO authenticated, service_role;

-- 4. Recreate admin-only profile read policy using private.has_role
CREATE POLICY "admins see all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- 5. participants: drop permissive policies, replace with admin-only RLS
DROP POLICY IF EXISTS "participants public read"   ON public.participants;
DROP POLICY IF EXISTS "participants public insert" ON public.participants;
DROP POLICY IF EXISTS "participants public update" ON public.participants;
DROP POLICY IF EXISTS "participants public delete" ON public.participants;

CREATE POLICY "participants admin select" ON public.participants
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "participants admin insert" ON public.participants
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "participants admin update" ON public.participants
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "participants admin delete" ON public.participants
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- 6. app_settings: keep public read; restrict writes to admins
DROP POLICY IF EXISTS "app_settings write all" ON public.app_settings;

CREATE POLICY "app_settings admin insert" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "app_settings admin update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "app_settings admin delete" ON public.app_settings
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- 7. designs: keep public read; restrict writes to admins
DROP POLICY IF EXISTS "designs public insert" ON public.designs;
DROP POLICY IF EXISTS "designs public update" ON public.designs;
DROP POLICY IF EXISTS "designs public delete" ON public.designs;

CREATE POLICY "designs admin insert" ON public.designs
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin')
    AND id ~ '^[a-z][a-z0-9_-]{0,30}$'
    AND length(label) BETWEEN 1 AND 80
  );

CREATE POLICY "designs admin update" ON public.designs
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    private.has_role(auth.uid(), 'admin')
    AND id ~ '^[a-z][a-z0-9_-]{0,30}$'
    AND length(label) BETWEEN 1 AND 80
  );

CREATE POLICY "designs admin delete" ON public.designs
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

-- 8. design_pages: keep public read; restrict writes to admins
DROP POLICY IF EXISTS "design_pages public insert" ON public.design_pages;
DROP POLICY IF EXISTS "design_pages public update" ON public.design_pages;
DROP POLICY IF EXISTS "design_pages public delete" ON public.design_pages;

CREATE POLICY "design_pages admin insert" ON public.design_pages
  FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin')
    AND design ~ '^[a-z][a-z0-9_-]{0,30}$'
    AND page   ~ '^[a-z][a-z0-9_-]{0,40}$'
    AND kind IN ('html','css','js')
    AND length(content) <= 4000000
  );

CREATE POLICY "design_pages admin update" ON public.design_pages
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    private.has_role(auth.uid(), 'admin')
    AND design ~ '^[a-z][a-z0-9_-]{0,30}$'
    AND page   ~ '^[a-z][a-z0-9_-]{0,40}$'
    AND kind IN ('html','css','js')
    AND length(content) <= 4000000
  );

CREATE POLICY "design_pages admin delete" ON public.design_pages
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
