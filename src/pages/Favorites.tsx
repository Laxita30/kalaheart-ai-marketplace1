import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getWishlistItems, toggleWishlist, addToCart } from "@/lib/api";
import SafeImage from "@/components/SafeImage";

const Favorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try { setItems(await getWishlistItems()); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const remove = async (productId: string) => {
    await toggleWishlist(productId);
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const moveToCart = async (productId: string) => {
    try {
      await addToCart(productId, 1);
      toast({ title: "Added to cart" });
    } catch (e: any) {
      toast({ title: "Could not add", description: e.message, variant: "destructive" });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground/40" />
          <h1 className="text-2xl font-display font-bold mt-4">Sign in to see favorites</h1>
          <Link to="/login"><Button className="mt-6">Sign in</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-5xl">
        <h1 className="text-3xl font-display font-bold mb-6">Your Favorites</h1>
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h2 className="text-xl font-semibold mt-4">No favorites yet</h2>
            <Link to="/browse"><Button className="mt-6">Browse Products</Button></Link>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <Link to={`/product/${item.product_id}`}>
                  <SafeImage
                    src={item.products?.images?.[0]}
                    alt={item.products?.title || "Product"}
                    kind="product"
                    fallbackSeed={item.product_id}
                    className="w-full aspect-square object-cover hover:scale-105 transition-transform"
                  />
                </Link>
                <div className="p-4">
                  <Link to={`/product/${item.product_id}`} className="font-semibold hover:text-primary">
                    {item.products?.title}
                  </Link>
                  <p className="text-price font-bold mt-1">
                    {item.products?.currency}{Number(item.products?.price || 0).toFixed(2)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1 gap-1" onClick={() => moveToCart(item.product_id)}>
                      <ShoppingCart className="h-3.5 w-3.5" /> Add to cart
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(item.product_id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;