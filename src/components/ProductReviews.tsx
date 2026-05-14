import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import SafeImage from "@/components/SafeImage";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  image_urls?: string[] | null;
  profiles?: { first_name: string | null; last_name: string | null; avatar_url: string | null } | null;
};

const ProductReviews = ({ productId }: { productId: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("id, rating, comment, created_at, user_id, image_urls")
      .eq("product_id", productId)
      .eq("is_public", true)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Review[];
    // attach profile names
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: ids });
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      list.forEach((r) => (r.profiles = map.get(r.user_id) ?? null));
    }
    setReviews(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`reviews-${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews", filter: `product_id=eq.${productId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const submit = async () => {
    if (!user) {
      toast({ title: "Sign in to leave a review", variant: "destructive" });
      return;
    }
    if (!comment.trim()) {
      toast({ title: "Please write a short comment", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating,
        comment: comment.trim().slice(0, 1000),
      });
      if (error) throw error;
      setComment("");
      setRating(5);
      toast({ title: "Review posted" });
      await load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const avg =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Customer Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < Math.round(avg) ? "fill-current text-star" : "text-muted"}`}
                />
              ))}
            </div>
            <span>
              {avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {user && (
        <Card className="p-4">
          <p className="text-sm font-medium mb-2">Write a review</p>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Rate ${n} stars`}
                onClick={() => setRating(n)}
                className="p-0.5"
              >
                <Star
                  className={`h-5 w-5 ${n <= rating ? "fill-current text-star" : "text-muted"}`}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share what you love about this piece…"
            maxLength={1000}
            rows={3}
          />
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Post review
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const name =
              [r.profiles?.first_name, r.profiles?.last_name].filter(Boolean).join(" ") || "Customer";
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center overflow-hidden text-xs font-semibold">
                      {r.profiles?.avatar_url ? (
                        <SafeImage
                          src={r.profiles.avatar_url}
                          alt={name}
                          kind="avatar"
                          fallbackSeed={r.id}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current text-star" : "text-muted"}`}
                      />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm mt-2 leading-relaxed">{r.comment}</p>}
                {r.image_urls && r.image_urls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.image_urls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block h-20 w-20 rounded-md overflow-hidden border"
                      >
                        <img src={url} alt="Review photo" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;