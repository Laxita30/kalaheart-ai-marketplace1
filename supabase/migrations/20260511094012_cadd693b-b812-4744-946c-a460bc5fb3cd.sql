
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;

CREATE POLICY "Public reviews viewable by everyone"
  ON public.reviews FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own reviews"
  ON public.reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
