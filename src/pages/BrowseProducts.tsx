import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Heart, ShoppingCart, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getProducts, addToCart, toggleWishlist, getWishlistItems } from "@/lib/api";

const CATEGORIES = ["Pottery", "Painting", "Textile", "Jewelry", "Sculpture", "Decor"];

const BrowseProducts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState([0, 300]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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

  const toggleCategory = (cat: string) =>
    setSelectedCategories((p) => p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]);

  const filtered = useMemo(() => products.filter((p) => {
    const text = `${p.title} ${p.artists?.shop_name || ""}`.toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    const price = Number(p.price);
    const matchPrice = price >= priceRange[0] && price <= priceRange[1];
    const matchCat = selectedCategories.length === 0 || selectedCategories.includes(p.category);
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
                <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={300} step={10} className="mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>${priceRange[0]}</span><span>${priceRange[1]}</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3">Category</h4>
                <div className="space-y-2">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedCategories.includes(cat)} onCheckedChange={() => toggleCategory(cat)} />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div>
            <h2 className="text-2xl font-display font-bold mb-6">Discover Unique Creations</h2>
            {loading ? (
              <p className="text-muted-foreground text-center py-12">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No products found.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((p) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="group block rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square overflow-hidden relative">
                      <img
                        src={p.images?.[0] || "/placeholder.svg"}
                        alt={p.title}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={(e) => handleWishlist(e, p.id)}>
                          <Heart className={`h-4 w-4 ${wishlistIds.has(p.id) ? "fill-current text-red-500" : ""}`} />
                        </Button>
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={(e) => handleAddToCart(e, p.id)}>
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
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="h-3.5 w-3.5 fill-current text-star" />
                        <span className="text-xs text-muted-foreground">{Number(p.rating).toFixed(1)}</span>
                      </div>
                    </div>
                  </Link>
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