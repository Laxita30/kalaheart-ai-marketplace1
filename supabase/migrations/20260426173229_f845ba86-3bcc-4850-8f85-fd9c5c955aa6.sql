CREATE TABLE public.recommendation_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  product_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('impression','click','wishlist','purchase')),
  reason text NOT NULL DEFAULT 'ai',
  surface text,
  source_product_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_rec_events_type_time ON public.recommendation_events(event_type, created_at DESC);
CREATE INDEX idx_rec_events_user ON public.recommendation_events(user_id, created_at DESC);
CREATE INDEX idx_rec_events_reason ON public.recommendation_events(reason);

ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own rec events"
ON public.recommendation_events FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users view own rec events"
ON public.recommendation_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all rec events"
ON public.recommendation_events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.rec_analytics_summary(_from timestamptz, _to timestamptz)
RETURNS TABLE(
  reason text,
  impressions bigint,
  clicks bigint,
  wishlists bigint,
  purchases bigint,
  ctr numeric,
  wishlist_rate numeric,
  purchase_rate numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT reason, event_type
    FROM public.recommendation_events
    WHERE created_at >= _from AND created_at < _to
      AND has_role(auth.uid(), 'admin'::app_role)
  ),
  agg AS (
    SELECT
      reason,
      COUNT(*) FILTER (WHERE event_type = 'impression') AS impressions,
      COUNT(*) FILTER (WHERE event_type = 'click')      AS clicks,
      COUNT(*) FILTER (WHERE event_type = 'wishlist')   AS wishlists,
      COUNT(*) FILTER (WHERE event_type = 'purchase')   AS purchases
    FROM base
    GROUP BY reason
  )
  SELECT
    reason,
    impressions,
    clicks,
    wishlists,
    purchases,
    CASE WHEN impressions > 0 THEN ROUND(clicks::numeric    / impressions, 4) ELSE 0 END AS ctr,
    CASE WHEN impressions > 0 THEN ROUND(wishlists::numeric / impressions, 4) ELSE 0 END AS wishlist_rate,
    CASE WHEN impressions > 0 THEN ROUND(purchases::numeric / impressions, 4) ELSE 0 END AS purchase_rate
  FROM agg
  ORDER BY impressions DESC;
$$;