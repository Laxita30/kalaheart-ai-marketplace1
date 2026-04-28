import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Star, User, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RecommendedProducts from "@/components/RecommendedProducts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getProduct, addToCart, toggleWishlist } from "@/lib/api";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const p = await getProduct(id);
        setProduct(p);
        if (user) {
          await supabase.from("product_views").insert({ user_id: user.id, product_id: id });
          const { data: wl } = await supabase.from("wishlist").select("id").eq("user_id", user.id).eq("product_id", id).maybeSingle();
          setFavorited(!!wl);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  const handleAddToCart = async () => {
    if (!user) { toast({ title: "Sign in to add to cart", variant: "destructive" }); navigate("/login"); return; }
    setBusy(true);
    try {
      await addToCart(id!, 1);
      toast({ title: "Added to cart" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const handleFavorite = async () => {
    if (!user) { toast({ title: "Sign in to favorite", variant: "destructive" }); navigate("/login"); return; }
    try {
      const added = await toggleWishlist(id!);
      setFavorited(added);
      toast({ title: added ? "Added to favorites" : "Removed from favorites" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-display font-bold">Product not found</h1>
          <Link to="/browse" className="text-primary mt-4 inline-block">← Back to browse</Link>
        </div>
      </div>
    );
  }

  const artist = product.artists;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="rounded-xl overflow-hidden border bg-card">
            <img
              src={product.images?.[0] || "/placeholder.svg"}
              alt={product.title}
              className="w-full aspect-square object-cover"
            />
          </div>

          <div>
            <h1 className="text-3xl font-display font-bold">{product.title}</h1>
            <p className="text-muted-foreground mt-3 leading-relaxed">{product.description}</p>

            <p className="text-3xl font-bold text-price mt-6">
              {product.currency}{Number(product.price).toFixed(2)}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-current text-star" : "text-muted"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({product.review_count} reviews)</span>
            </div>

            <p className="text-sm text-muted-foreground mt-2">In stock: {product.stock}</p>

            <div className="flex gap-3 mt-8">
              <Button size="lg" className="flex-1 gap-2" onClick={handleAddToCart} disabled={busy || product.stock === 0}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                {product.stock === 0 ? "Out of stock" : "Add to Cart"}
              </Button>
              <Button variant="outline" size="lg" onClick={handleFavorite}>
                <Heart className={`h-4 w-4 ${favorited ? "fill-current text-red-500" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {artist && (
          <div className="mt-12 rounded-xl border bg-card p-8">
            <h2 className="text-xl font-display font-bold mb-4">About the Artist</h2>
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center shrink-0 overflow-hidden">
                {artist.profile_photo_url ? (
                  <img src={artist.profile_photo_url} alt={artist.shop_name} className="h-full w-full object-cover" />
                ) : <User className="h-7 w-7 text-primary" />}
              </div>
              <div>
                <h3 className="font-semibold">{artist.shop_name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3.5 w-3.5 fill-current text-star" />
                  <span className="text-xs text-muted-foreground">{Number(artist.rating || 0).toFixed(1)} Rating</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{artist.ai_story || artist.description}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-16">
          <RecommendedProducts currentProductId={id} limit={6} title="You might also love" />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;