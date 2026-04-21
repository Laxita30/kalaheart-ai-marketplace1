import { useEffect, useState } from "react";
import ArtistDashboardLayout from "@/components/ArtistDashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getMyArtistOrders } from "@/lib/api";

const ArtistOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { getMyArtistOrders().then(setOrders); }, []);

  return (
    <ArtistDashboardLayout title="Orders">
      <Card>
        {orders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No orders yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{new Date(o.orders?.created_at ?? o.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-xs">#{(o.orders?.id ?? "").slice(0, 8)}</TableCell>
                  <TableCell>{o.products?.title}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>${(Number(o.price) * o.quantity).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={o.orders?.status === "completed" ? "default" : "secondary"}>
                      {o.orders?.status ?? "pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </ArtistDashboardLayout>
  );
};

export default ArtistOrders;