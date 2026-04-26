CREATE TABLE public.product_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_views_user ON public.product_views(user_id, viewed_at DESC);
CREATE INDEX idx_product_views_product ON public.product_views(product_id);

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own product views"
ON public.product_views FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own product views"
ON public.product_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all product views"
ON public.product_views FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));