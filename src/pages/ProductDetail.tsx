import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Heart,
  ShoppingCart,
  Star,
  User,
  ArrowLeft,
  Loader2,
  MessageCircle,
  Truck,
  ShieldCheck,
  Package,
  Tag,
  Layers,
  Ruler,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RecommendedProducts from "@/components/RecommendedProducts";
import ProductReviews from "@/components/ProductReviews";
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
  const [activeImage, setActiveImage] = useState(0);

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
  const images: string[] =
    product.images && product.images.length > 0 ? product.images : ["/placeholder.svg"];
  const inStock = Number(product.stock ?? 0) > 0;
  const lowStock = inStock && Number(product.stock) <= 5;

  const handleContactArtist = () => {
    if (!user) {
      toast({ title: "Sign in to message the artist", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (!artist?.user_id) {
      toast({ title: "Artist unavailable", variant: "destructive" });
      return;
    }
    navigate(`/chat/${artist.user_id}`, {
      state: {
        product: {
          id: product.id,
          title: product.title,
          price: product.price,
          currency: product.currency,
          image: images[0],
          url: `${window.location.origin}/product/${product.id}`,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border bg-card p-5 space-y-4 shadow-sm">
            <div className="rounded-xl overflow-hidden bg-muted/30">
              <img
                src={images[activeImage]}
                alt={product.title}
                className="w-full aspect-square object-cover"
               onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb = "1"; t.src = "/placeholder.svg"; } }} />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`rounded-md overflow-hidden border aspect-square ${
                      activeImage === i ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img src={src} alt={`${product.title} ${i + 1}`} className="w-full h-full object-cover"  onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb = "1"; t.src = "/placeholder.svg"; } }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {product.category && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {product.category}
                </Badge>
              )}
              {inStock ? (
                <Badge variant={lowStock ? "destructive" : "outline"}>
                  {lowStock ? `Only ${product.stock} left` : "In stock"}
                </Badge>
              ) : (
                <Badge variant="destructive">Out of stock</Badge>
              )}
            </div>

            <h1 className="text-3xl font-display font-bold mt-3 leading-tight">{product.title}</h1>

            <p className="text-foreground/80 mt-4 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>

            <p className="text-3xl font-bold text-price mt-5">
              {product.currency}
              {Number(product.price).toFixed(2)}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(product.rating) ? "fill-current text-star" : "text-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                ({product.review_count} reviews)
              </span>
            </div>

            {(product.materials || product.dimensions || product.care_instructions) && (
              <div className="mt-6 rounded-lg border bg-card/50 divide-y">
                <h2 className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Specifications
                </h2>
                {product.materials && (
                  <div className="flex gap-3 px-4 py-3">
                    <Layers className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Materials</p>
                      <p className="text-muted-foreground mt-0.5 whitespace-pre-line">{product.materials}</p>
                    </div>
                  </div>
                )}
                {product.dimensions && (
                  <div className="flex gap-3 px-4 py-3">
                    <Ruler className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Dimensions</p>
                      <p className="text-muted-foreground mt-0.5 whitespace-pre-line">{product.dimensions}</p>
                    </div>
                  </div>
                )}
                {product.care_instructions && (
                  <div className="flex gap-3 px-4 py-3">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Care instructions</p>
                      <p className="text-muted-foreground mt-0.5 whitespace-pre-line">{product.care_instructions}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-6 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Category</p>
                <p className="font-medium mt-1 capitalize">{product.category || "—"}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Available</p>
                <p className="font-medium mt-1">{product.stock} pcs</p>
              </div>
              <div className="rounded-md border p-3 flex items-start gap-2">
                <Truck className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Shipping</p>
                  <p className="font-medium mt-0.5">3–7 business days</p>
                </div>
              </div>
              <div className="rounded-md border p-3 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Authenticity</p>
                  <p className="font-medium mt-0.5">Handcrafted, verified artist</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={busy || !inStock}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                {!inStock ? "Out of stock" : "Add to Cart"}
              </Button>
              <Button variant="outline" size="lg" onClick={handleFavorite} aria-label="Toggle favorite">
                <Heart className={`h-4 w-4 ${favorited ? "fill-current text-red-500" : ""}`} />
              </Button>
            </div>

            {artist?.user_id && (
              <Button
                variant="secondary"
                size="lg"
                className="w-full mt-3 gap-2"
                onClick={handleContactArtist}
              >
                <MessageCircle className="h-4 w-4" />
                Contact the artist
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <Package className="h-3 w-3" />
              Direct chats with artists are recorded and reviewed by admin moderators for safety.
            </p>
          </div>
        </div>

        {artist && (
          <div className="mt-12 rounded-xl border bg-card p-8">
            <h2 className="text-xl font-display font-bold mb-4">About the Artist</h2>
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center shrink-0 overflow-hidden">
                {artist.profile_photo_url ? (
                  <img src={artist.profile_photo_url} alt={artist.shop_name} className="h-full w-full object-cover"  onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb = "1"; t.src = "/placeholder.svg"; } }} />
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
          <ProductReviews productId={id!} />
        </div>

        <div className="mt-16">
          <RecommendedProducts currentProductId={id} limit={6} title="You might also love" />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;