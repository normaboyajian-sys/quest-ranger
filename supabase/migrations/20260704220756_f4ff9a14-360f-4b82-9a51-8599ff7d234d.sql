-- Restrict SELECT on the plaintext password column so only service_role
-- (used by admin server functions) can read it. Authenticated users keep
-- read access to their own non-sensitive profile fields via RLS.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, username, subscription_until, created_at, updated_at, active_session_id)
  ON public.profiles TO authenticated;
-- UPDATE stays column-limited too — users must not be able to overwrite
-- their own password or role-relevant columns from the client.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username) ON public.profiles TO authenticated;
