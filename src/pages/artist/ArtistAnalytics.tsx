import { useEffect, useState } from "react";
import ArtistDashboardLayout from "@/components/ArtistDashboardLayout";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { getMyArtistOrders, getMyProducts } from "@/lib/api";

const COLORS = ["hsl(var(--primary))", "hsl(var(--star))", "hsl(var(--price))", "#60a5fa", "#34d399"];

const ArtistAnalytics = () => {
  const [revenue, setRevenue] = useState<{ date: string; total: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; sold: number }[]>([]);
  const [byCategory, setByCategory] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [orders, products] = await Promise.all([getMyArtistOrders(), getMyProducts()]);

      // revenue per day (last 14 days)
      const days: Record<string, number> = {};
      const today = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today); d.setDate(today.getDate() - i);
        days[d.toISOString().slice(5, 10)] = 0;
      }
      orders.forEach((o: any) => {
        const key = new Date(o.orders?.created_at ?? o.created_at).toISOString().slice(5, 10);
        if (key in days) days[key] += Number(o.price) * o.quantity;
      });
      setRevenue(Object.entries(days).map(([date, total]) => ({ date, total: Number(total.toFixed(2)) })));

      // top products by qty sold
      const counts: Record<string, { name: string; sold: number }> = {};
      orders.forEach((o: any) => {
        const id = o.product_id;
        if (!counts[id]) counts[id] = { name: o.products?.title ?? "—", sold: 0 };
        counts[id].sold += o.quantity;
      });
      setTopProducts(Object.values(counts).sort((a, b) => b.sold - a.sold).slice(0, 5));

      // products by category
      const cats: Record<string, number> = {};
      products.forEach((p) => { cats[p.category] = (cats[p.category] ?? 0) + 1; });
      setByCategory(Object.entries(cats).map(([name, value]) => ({ name, value })));
    })();
  }, []);

  return (
    <ArtistDashboardLayout title="Analytics">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Revenue (last 14 days)</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Top selling products</h3>
          <div className="h-64">
            {topProducts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No sales yet</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="sold" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Products by category</h3>
          <div className="h-64">
            {byCategory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No products yet</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={80} label>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </ArtistDashboardLayout>
  );
};

export default ArtistAnalytics;