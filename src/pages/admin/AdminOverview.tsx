import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Users, Package, Palette, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminOverview = () => {
  const [stats, setStats] = useState({ users: 0, artists: 0, products: 0, orders: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("artists").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }),
    ]).then(([u, a, p, o]) => {
      setStats({
        users: u.count ?? 0,
        artists: a.count ?? 0,
        products: p.count ?? 0,
        orders: o.count ?? 0,
      });
    });
  }, []);

  const cards = [
    { label: "Users", value: stats.users, icon: Users },
    { label: "Artists", value: stats.artists, icon: Palette },
    { label: "Products", value: stats.products, icon: Package },
    { label: "Orders", value: stats.orders, icon: ShoppingBag },
  ];

  return (
    <AdminLayout title="Overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-bold">{c.value}</p>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminOverview;
