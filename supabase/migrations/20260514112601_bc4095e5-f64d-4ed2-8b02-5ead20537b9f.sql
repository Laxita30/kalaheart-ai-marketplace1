-- Restore full column SELECT grants; rely on RLS for row-level access.
GRANT SELECT ON public.profiles TO anon, authenticated;

-- Drop the broad permissive SELECT policy added earlier; own + admin
-- policies already cover legitimate access.
DROP POLICY IF EXISTS "Public can read profiles (column-restricted)" ON public.profiles;

-- Make the public-safe view run as definer so anon/auth can read
-- non-sensitive fields without needing row-level access on profiles.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, user_id, first_name, last_name, avatar_url, created_at
FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;