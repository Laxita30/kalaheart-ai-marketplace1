
CREATE OR REPLACE FUNCTION public.is_artist_for_order(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    JOIN public.artists a ON a.id = p.artist_id
    WHERE oi.order_id = _order_id
      AND a.user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Artists can view orders containing their products" ON public.orders;
DROP POLICY IF EXISTS "Artists can update orders for their products" ON public.orders;

CREATE POLICY "Artists can view orders containing their products"
ON public.orders FOR SELECT
USING (public.is_artist_for_order(id, auth.uid()));

CREATE POLICY "Artists can update orders for their products"
ON public.orders FOR UPDATE
USING (public.is_artist_for_order(id, auth.uid()));
