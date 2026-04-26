import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Sparkles } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  reason: string;
  impressions: number;
  clicks: number;
  wishlists: number;
  purchases: number;
  ctr: number;
  wishlist_rate: number;
  purchase_rate: number;
};

const fmtPct = (n: number) => `${(Number(n) * 100).toFixed(2)}%`;
const fmtInt = (n: number) => Number(n).toLocaleString();

const reasonLabel: Record<string, string> = {
  ai: "AI personalized",
  popular: "Popularity (no signals)",
  fallback: "Heuristic fallback",
};

const reasonVariant = (r: string) =>
  r === "ai" ? "default" : r === "popular" ? "secondary" : "outline";

const AdminRecommendations = () => {
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const defaultFrom = useMemo(() => format(subDays(new Date(), 30), "yyyy-MM-dd"), []);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso = new Date(`${to}T23:59:59.999`).toISOString();
      const { data, error } = await supabase.rpc("rec_analytics_summary", {
        _from: fromIso,
        _to: toIso,
      });
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      console.error("Failed to load rec analytics", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const acc = { impressions: 0, clicks: 0, wishlists: 0, purchases: 0 };
    for (const r of rows) {
      acc.impressions += Number(r.impressions);
      acc.clicks += Number(r.clicks);
      acc.wishlists += Number(r.wishlists);
      acc.purchases += Number(r.purchases);
    }
    return acc;
  }, [rows]);

  const totalCtr = totals.impressions ? totals.clicks / totals.impressions : 0;
  const totalWish = totals.impressions ? totals.wishlists / totals.impressions : 0;
  const totalBuy = totals.impressions ? totals.purchases / totals.impressions : 0;

  return (
    <AdminLayout title="Recommendation analytics">
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <Label htmlFor="from" className="text-xs">From</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div>
          <Label htmlFor="to" className="text-xs">To</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Apply"}
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Impressions" value={fmtInt(totals.impressions)} />
        <Stat label="Click-through rate" value={fmtPct(totalCtr)} sub={`${fmtInt(totals.clicks)} clicks`} />
        <Stat label="Wishlist rate" value={fmtPct(totalWish)} sub={`${fmtInt(totals.wishlists)} adds`} />
        <Stat label="Buy-intent rate" value={fmtPct(totalBuy)} sub={`${fmtInt(totals.purchases)} purchases`} />
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">By recommendation reason</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Wishlists</TableHead>
              <TableHead className="text-right">Wishlist rate</TableHead>
              <TableHead className="text-right">Purchases</TableHead>
              <TableHead className="text-right">Purchase rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No recommendation events in this date range yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.reason}>
                  <TableCell>
                    <Badge variant={reasonVariant(r.reason) as any}>
                      {reasonLabel[r.reason] ?? r.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmtInt(r.impressions)}</TableCell>
                  <TableCell className="text-right">{fmtInt(r.clicks)}</TableCell>
                  <TableCell className="text-right">{fmtPct(r.ctr)}</TableCell>
                  <TableCell className="text-right">{fmtInt(r.wishlists)}</TableCell>
                  <TableCell className="text-right">{fmtPct(r.wishlist_rate)}</TableCell>
                  <TableCell className="text-right">{fmtInt(r.purchases)}</TableCell>
                  <TableCell className="text-right">{fmtPct(r.purchase_rate)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Conversions are attributed when a shopper clicks an AI recommendation and then adds the product
        to their wishlist or cart within 7 days, on the same device.
      </p>
    </AdminLayout>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-lg border bg-card p-4">
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold mt-1">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </div>
);

export default AdminRecommendations;