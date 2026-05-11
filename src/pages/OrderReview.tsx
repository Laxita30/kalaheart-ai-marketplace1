import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SafeImage from "@/components/SafeImage";

type Item = {
  id: string;
  product_id: string;
  products: { title: string; images: string[] | null } | null;
};

type Draft = { rating: number; comment: string; isPublic: boolean; existingId?: string };

const OrderReview = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      setLoading(true);
      const { data: order } = await supabase
        .from("orders")
        .select("id, status, order_items(id, product_id, products(title, images))")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!order) {
        setLoading(false);
        return;
      }
      setStatus(order.status);
      const list = (order.order_items ?? []) as Item[];
      setItems(list);
      const productIds = list.map((i) => i.product_id);
      const { data: existing } = await supabase
        .from("reviews")
        .select("id, product_id, rating, comment, is_public")
        .eq("user_id", user.id)
        .in("product_id", productIds);
      const map: Record<string, Draft> = {};
      list.forEach((it) => {
        const r = (existing ?? []).find((x: any) => x.product_id === it.product_id);
        map[it.product_id] = r
          ? { rating: r.rating, comment: r.comment ?? "", isPublic: (r as any).is_public ?? true, existingId: r.id }
          : { rating: 5, comment: "", isPublic: true };
      });
      setDrafts(map);
      setLoading(false);
    })();
  }, [user, id]);

  const setDraft = (productId: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [productId]: { ...d[productId], ...patch } }));

  const submit = async (productId: string) => {
    if (!user) return;
    const d = drafts[productId];
    if (!d.comment.trim()) {
      toast({ title: "Please write a short comment", variant: "destructive" });
      return;
    }
    setSaving(productId);
    try {
      if (d.existingId) {
        const { error } = await supabase
          .from("reviews")
          .update({ rating: d.rating, comment: d.comment.trim().slice(0, 1000), is_public: d.isPublic })
          .eq("id", d.existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("reviews")
          .insert({
            product_id: productId,
            user_id: user.id,
            rating: d.rating,
            comment: d.comment.trim().slice(0, 1000),
            is_public: d.isPublic,
          })
          .select("id")
          .single();
        if (error) throw error;
        setDraft(productId, { existingId: data.id });
      }
      toast({ title: "Review saved" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="container py-12">
        <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
      </div>
    );
  }

  if (status !== "delivered") {
    return (
      <div className="container py-12">
        <Card className="p-8 text-center space-y-3">
          <p className="text-muted-foreground">
            You can write a review once your order is marked delivered.
          </p>
          <Button asChild variant="outline">
            <Link to={`/orders/${id}`}>Back to order</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link to={`/orders/${id}`} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to order
        </Link>
      </Button>
      <h1 className="text-2xl font-display font-bold mb-2">Review your purchase</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Share what you loved. Toggle visibility to keep a review private if you prefer.
      </p>

      <div className="space-y-6">
        {items.map((it) => {
          const d = drafts[it.product_id];
          if (!d) return null;
          return (
            <Card key={it.id} className="p-5">
              <div className="flex gap-4">
                <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  <SafeImage
                    src={it.products?.images?.[0]}
                    alt={it.products?.title || "Product"}
                    kind="product"
                    fallbackSeed={it.id}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${it.product_id}`}
                    className="font-medium hover:underline"
                  >
                    {it.products?.title}
                  </Link>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`Rate ${n} stars`}
                        onClick={() => setDraft(it.product_id, { rating: n })}
                        className="p-0.5"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            n <= d.rating ? "fill-current text-star" : "text-muted"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Textarea
                value={d.comment}
                onChange={(e) => setDraft(it.product_id, { comment: e.target.value })}
                placeholder="Tell other shoppers what you think…"
                rows={3}
                maxLength={1000}
                className="mt-4"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`pub-${it.product_id}`}
                    checked={d.isPublic}
                    onCheckedChange={(v) => setDraft(it.product_id, { isPublic: v })}
                  />
                  <Label htmlFor={`pub-${it.product_id}`} className="text-sm">
                    {d.isPublic ? "Public — visible on the product page" : "Private — only you can see it"}
                  </Label>
                </div>
                <Button
                  size="sm"
                  onClick={() => submit(it.product_id)}
                  disabled={saving === it.product_id}
                >
                  {saving === it.product_id && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {d.existingId ? "Update review" : "Post review"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OrderReview;