
-- Add demographic fields to user profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text;

-- Extend artists table with story, language, ID proof, profile photo, and review status
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS ai_story text,
  ADD COLUMN IF NOT EXISTS story_language text,
  ADD COLUMN IF NOT EXISTS id_proof_url text,
  ADD COLUMN IF NOT EXISTS profile_photo_url text,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- Storage buckets for artist verification and product photos
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('artist-ids', 'artist-ids', false),
  ('artist-photos', 'artist-photos', true),
  ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

-- artist-ids: private. Owner & admins can view; owner can upload to their folder; admins can manage.
CREATE POLICY "Artists can upload own ID proof"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artist-ids'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Artists can view own ID proof"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'artist-ids'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Artists can update own ID proof"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artist-ids'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can delete ID proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artist-ids'
  AND public.has_role(auth.uid(), 'admin')
);

-- artist-photos: public read, owner write
CREATE POLICY "Artist photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-photos');

CREATE POLICY "Artists can upload own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artist-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Artists can update own profile photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artist-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Artists can delete own profile photo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artist-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- product-photos: public read, owner write (folder = artist user_id)
CREATE POLICY "Product photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-photos');

CREATE POLICY "Artists can upload product photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Artists can update own product photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Artists can delete own product photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
