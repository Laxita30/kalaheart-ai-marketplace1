import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Heart, ShoppingCart, Star, Info, Layers, Ruler, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getProducts, addToCart, toggleWishlist, getWishlistItems } from "@/lib/api";
import SafeImage from "@/components/SafeImage";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["Pottery", "Painting", "Textile", "Jewelry", "Sculpture", "Decor", "Other"];

const BrowseProducts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState([0, 300]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [draftPriceRange, setDraftPriceRange] = useState([0, 300]);
  const [draftCategories, setDraftCategories] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getProducts();
        setProducts(data);
        if (user) {
          const wl = await getWishlistItems();
          setWishlistIds(new Set(wl.map((w: any) => w.product_id)));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Live stock updates: keep the visible product list in sync with
  // inventory changes from new orders/edits, without refetching.
  useEffect(() => {
    const channel = supabase
      .channel("browse-products-stock")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          const updated: any = payload.new;
          if (!updated?.id) return;
          setProducts((prev) =>
            prev.map((p) =>
              p.id === updated.id
                ? { ...p, stock: updated.stock, is_active: updated.is_active }
                : p,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleCategory = (cat: string) =>
    setDraftCategories((p) => p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]);

  const applyFilters = () => {
    setPriceRange(draftPriceRange);
    setSelectedCategories(draftCategories);
  };

  const resetFilters = () => {
    setDraftPriceRange([0, 300]);
    setDraftCategories([]);
    setPriceRange([0, 300]);
    setSelectedCategories([]);
  };

  const filtered = useMemo(() => products.filter((p) => {
    const text = `${p.title} ${p.artists?.shop_name || ""}`.toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    const price = Number(p.price);
    const matchPrice = price >= priceRange[0] && price <= priceRange[1];
    const matchCat =
      selectedCategories.length === 0 ||
      selectedCategories.includes(p.category) ||
      (selectedCategories.includes("Other") && !CATEGORIES.slice(0, -1).includes(p.category));
    return matchSearch && matchPrice && matchCat;
  }), [products, search, priceRange, selectedCategories]);

  const handleAddToCart = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!user) { toast({ title: "Sign in to add to cart", variant: "destructive" }); return; }
    try {
      await addToCart(id, 1);
      toast({ title: "Added to cart" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleWishlist = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (!user) { toast({ title: "Sign in to favorite items", variant: "destructive" }); return; }
    try {
      const isAdded = await toggleWishlist(id);
      setWishlistIds((prev) => {
        const n = new Set(prev);
        isAdded ? n.add(id) : n.delete(id);
        return n;
      });
      toast({ title: isAdded ? "Added to favorites" : "Removed from favorites" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <div className="max-w-2xl mx-auto mb-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search for art, artists, or styles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="grid md:grid-cols-[260px_1fr] gap-8">
          <aside>
            <div className="rounded-lg border bg-card p-5">
              <h3 className="font-semibold mb-4">Filters</h3>
              <div className="mb-6">
                <h4 className="text-sm font-medium mb-3">Price Range</h4>
                <Slider value={draftPriceRange} onValueChange={setDraftPriceRange} min={0} max={300} step={10} className="mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>${draftPriceRange[0]}</span><span>${draftPriceRange[1]}</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3">Category</h4>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={draftCategories.includes(cat)} onCheckedChange={() => toggleCategory(cat)} />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button className="flex-1" onClick={applyFilters}>Apply</Button>
                <Button variant="outline" onClick={resetFilters}>Reset</Button>
              </div>
            </div>
          </aside>

          <div>
            <h2 className="text-2xl font-display font-bold mb-6">Discover Unique Creations</h2>
            <div className="mb-5 flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <span>
                Tip: click any product to open its dedicated details page at{" "}
                <code className="px-1 py-0.5 rounded bg-background border text-foreground">/product/:id</code>{" "}
                for full specs, reviews and to contact the artist.
              </span>
            </div>
            {loading ? (
              <p className="text-muted-foreground text-center py-12">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No products found.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((p) => (
                  {(() => {
                    const stock = Number(p.stock ?? 0);
                    const inStock = stock > 0;
                    const lowStock = inStock && stock <= 5;
                    return (
                  <Link key={p.id} to={`/product/${p.id}`} className="group block rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow relative">
                    <div className="aspect-square overflow-hidden relative">
                      <SafeImage
                        src={p.images?.[0]}
                        alt={p.title}
                        kind="product"
                        fallbackSeed={p.id}
                        className={`h-full w-full object-cover group-hover:scale-105 transition-transform ${
                          inStock ? "" : "grayscale opacity-70"
                        }`}
                      />
                      <div className="absolute top-3 left-3">
                        {!inStock ? (
                          <Badge variant="destructive" aria-live="polite">Out of stock</Badge>
                        ) : lowStock ? (
                          <Badge variant="destructive" aria-live="polite">Only {stock} left</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">In stock</Badge>
                        )}
                      </div>
                      {!inStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                          <span className="rounded-md bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-destructive border border-destructive/40">
                            Sold out
                          </span>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex gap-2">
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={(e) => handleWishlist(e, p.id)}>
                          <Heart className={`h-4 w-4 ${wishlistIds.has(p.id) ? "fill-current text-red-500" : ""}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 rounded-full"
                          onClick={(e) => handleAddToCart(e, p.id)}
                          disabled={!inStock}
                          aria-label={inStock ? "Add to cart" : "Out of stock"}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-tight">{p.title}</h3>
                        <span className="text-price font-bold text-sm whitespace-nowrap">{p.currency}{Number(p.price).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.artists?.shop_name}</p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-current text-star" />
                          <span className="text-xs text-muted-foreground">{Number(p.rating).toFixed(1)}</span>
                        </div>
                        <span
                          className={`text-[11px] font-medium ${
                            !inStock
                              ? "text-destructive"
                              : lowStock
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                          aria-live="polite"
                        >
                          {!inStock ? "0 in stock" : `${stock} in stock`}
                        </span>
                      </div>
                      {(p.materials || p.dimensions) && (
                        <div className="mt-3 pt-3 border-t space-y-1.5">
                          {p.materials && (
                            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <Layers className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                              <span className="line-clamp-1"><span className="font-medium text-foreground">Materials:</span> {p.materials}</span>
                            </div>
                          )}
                          {p.dimensions && (
                            <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <Ruler className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                              <span className="line-clamp-1"><span className="font-medium text-foreground">Size:</span> {p.dimensions}</span>
                            </div>
                          )}
                          <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            <Truck className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                            <span className="line-clamp-1"><span className="font-medium text-foreground">Shipping:</span> 3–7 business days</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                    );
                  })()}
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BrowseProducts;