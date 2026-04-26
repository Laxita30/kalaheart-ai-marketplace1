import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logRecClick, logRecImpressions } from "@/lib/recAnalytics";

type RecProduct = {
  id: string;
  title: string;
  price: number;
  currency: string | null;
  rating: number | null;
  images: string[] | null;
  artists?: { shop_name: string } | null;
};

interface Props {
  currentProductId?: string;
  limit?: number;
  title?: string;
  className?: string;
}

const RecommendedProducts = ({
  currentProductId,
  limit = 6,
  title = "Recommended for you",
  className,
}: Props) => {
  const [products, setProducts] = useState<RecProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<string>("ai");
  const surface = currentProductId ? "product_detail" : "home";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("recommend-products", {
          body: { currentProductId, limit },
        });
        if (error) throw error;
        const ids: string[] = data?.productIds ?? [];
        const recReason: string = data?.reason ?? "ai";
        if (!cancelled) setReason(recReason);
        if (ids.length === 0) {
          if (!cancelled) setProducts([]);
          return;
        }
        const { data: rows } = await supabase
          .from("products")
          .select("id, title, price, currency, rating, images, artists(shop_name)")
          .in("id", ids);
        const ordered = ids
          .map((id) => (rows ?? []).find((r) => r.id === id))
          .filter(Boolean) as RecProduct[];
        if (!cancelled) {
          setProducts(ordered);
          // Fire impression events for what's actually shown
          logRecImpressions(
            ordered.map((p) => p.id),
            recReason,
            surface,
            currentProductId,
          );
        }
      } catch (e) {
        console.error("Failed to load recommendations", e);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProductId, limit, surface]);

  if (!loading && products.length === 0) return null;

  return (
    <section className={className}>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-display font-bold">{title}</h2>
        <span className="text-xs text-muted-foreground ml-1">AI-personalized</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {products.map((p) => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              onClick={() => logRecClick(p.id, reason, surface, currentProductId)}
              className="group block rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                {p.images?.[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : null}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                    {p.title}
                  </h3>
                  <span className="text-price font-bold text-sm whitespace-nowrap">
                    {p.currency ?? "$"}
                    {Number(p.price).toFixed(2)}
                  </span>
                </div>
                {p.artists?.shop_name && (
                  <p className="text-xs text-muted-foreground mt-1">{p.artists.shop_name}</p>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <Star className="h-3.5 w-3.5 fill-current text-star" />
                  <span className="text-xs text-muted-foreground">
                    {Number(p.rating ?? 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default RecommendedProducts;