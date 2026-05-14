-- PROFILES: drop public-everything policy
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, user_id, first_name, last_name, avatar_url, created_at
FROM public.profiles;

CREATE POLICY "Public can read profiles (column-restricted)"
ON public.profiles
FOR SELECT
USING (true);

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, first_name, last_name, avatar_url, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
GRANT SELECT (email, phone, address, age, gender, blocked)
  ON public.profiles TO postgres, service_role;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_artist_buyer_contacts()
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.user_id, p.first_name, p.last_name, p.email, p.phone
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    JOIN public.products pr ON pr.id = oi.product_id
    JOIN public.artists a ON a.id = pr.artist_id
    WHERE o.user_id = p.user_id
      AND a.user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.get_artist_buyer_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_artist_buyer_contacts() TO authenticated;

-- ARTISTS: hide id_proof_url
REVOKE SELECT (id_proof_url) ON public.artists FROM anon, authenticated;
GRANT  SELECT (id_proof_url) ON public.artists TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.get_artist_id_proof(p_artist_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_owner uuid;
BEGIN
  SELECT id_proof_url, user_id INTO v_url, v_owner
  FROM public.artists WHERE id = p_artist_id;
  IF v_owner IS NULL THEN RETURN NULL; END IF;
  IF v_owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN v_url;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.get_artist_id_proof(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_artist_id_proof(uuid) TO authenticated;

-- NOTIFICATIONS: lock down inserts
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "Users insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins insert any notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.notify_order_buyer(
  p_order_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_authorized boolean;
BEGIN
  SELECT user_id INTO v_buyer FROM public.orders WHERE id = p_order_id;
  IF v_buyer IS NULL THEN RETURN; END IF;

  v_authorized := public.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products pr ON pr.id = oi.product_id
    JOIN public.artists a ON a.id = pr.artist_id
    WHERE oi.order_id = p_order_id AND a.user_id = auth.uid()
  );
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'not authorized to notify buyer for order %', p_order_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, order_id)
  VALUES (v_buyer, p_type, p_title, p_body, p_link, p_order_id);
END;
$$;
REVOKE ALL ON FUNCTION public.notify_order_buyer(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_order_buyer(uuid, text, text, text, text) TO authenticated;

-- CHAT MEDIA: private bucket + participant-scoped policies
UPDATE storage.buckets SET public = false WHERE id = 'chat-media';

DROP POLICY IF EXISTS "Public read chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload chat media" ON storage.objects;

CREATE POLICY "Chat participants read chat media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (t.user_id = auth.uid() OR t.artist_user_id = auth.uid())
  )
);

CREATE POLICY "Chat participants upload chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.chat_threads t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND (t.user_id = auth.uid() OR t.artist_user_id = auth.uid())
  )
);