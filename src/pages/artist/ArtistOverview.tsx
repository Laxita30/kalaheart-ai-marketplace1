import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, ShoppingBag, DollarSign, Star } from "lucide-react";
import ArtistDashboardLayout from "@/components/ArtistDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getMyArtist, getMyProducts, getMyArtistOrders } from "@/lib/api";

const ArtistOverview = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, rating: 0 });
  const [hasArtist, setHasArtist] = useState<boolean | null>(null);
  const [shopName, setShopName] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    (async () => {
      const artist = await getMyArtist();
      setHasArtist(!!artist);
      if (!artist) return;
      setShopName(artist.shop_name);
      const [products, orders] = await Promise.all([getMyProducts(), getMyArtistOrders()]);
      const revenue = orders.reduce((s: number, o: any) => s + Number(o.price) * o.quantity, 0);
      setStats({
        products: products.length,
        orders: orders.length,
        revenue,
        rating: Number(artist.rating ?? 0),
      });
    })();
  }, [user, authLoading, navigate]);

  if (hasArtist === false) {
    return (
      <ArtistDashboardLayout title="Welcome">
        <Card className="p-10 text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-display font-semibold mb-2">Set up your artist shop</h2>
          <p className="text-muted-foreground mb-6">Create your shop profile to start listing handmade products.</p>
          <Button size="lg" onClick={() => navigate("/artist/profile")}>Create shop profile</Button>
        </Card>
      </ArtistDashboardLayout>
    );
  }

  const cards = [
    { label: "Products", value: stats.products, icon: Package, color: "text-primary" },
    { label: "Orders", value: stats.orders, icon: ShoppingBag, color: "text-blue-600" },
    { label: "Revenue", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: "text-green-600" },
    { label: "Rating", value: stats.rating.toFixed(1), icon: Star, color: "text-yellow-500" },
  ];

  return (
    <ArtistDashboardLayout title={shopName ? `Hi, ${shopName}` : "Overview"}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-display font-bold mt-1">{c.value}</p>
              </div>
              <c.icon className={`h-8 w-8 ${c.color}`} />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Quick actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/artist/products")}>Manage products</Button>
            <Button variant="outline" onClick={() => navigate("/artist/orders")}>View orders</Button>
            <Button variant="outline" onClick={() => navigate("/artist/analytics")}>See analytics</Button>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
            <li>Add high quality photos to your products.</li>
            <li>Keep stock and prices up to date.</li>
            <li>Reply to orders quickly for better ratings.</li>
          </ul>
        </Card>
      </div>
    </ArtistDashboardLayout>
  );
};

export default ArtistOverview;