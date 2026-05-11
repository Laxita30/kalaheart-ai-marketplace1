import { useEffect, useState } from "react";
import ArtistDashboardLayout from "@/components/ArtistDashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getMyArtistOrders, updateOrderStatus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STATUS_FLOW = ["pending", "accepted", "shipped", "delivered"] as const;
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "outline",
  shipped: "outline",
  delivered: "default",
  rejected: "destructive",
  cancelled: "destructive",
};

const ArtistOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = () => getMyArtistOrders().then(setOrders);
  useEffect(() => {
    load();
    const channel = supabase
      .channel("artist-orders-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load(),
      )
      .subscribe();

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdate = async (orderId: string, status: string) => {
    if (!orderId) return;
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, status);
      toast({ title: "Order updated", description: `Status changed to ${status}.` });
      await load();
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message ?? "Could not update order.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const orderId = o.orders?.id as string | undefined;
                const status = (o.orders?.status ?? "pending") as string;
                const isFinal = status === "delivered" || status === "rejected" || status === "cancelled";
                const busy = updatingId === orderId;
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      {new Date(o.orders?.created_at ?? o.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">#{(orderId ?? "").slice(0, 8)}</TableCell>
                    <TableCell>{o.products?.title}</TableCell>
                    <TableCell>{o.quantity}</TableCell>
                    <TableCell>${(Number(o.price) * o.quantity).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {status === "pending" && orderId && (
                          <>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => handleUpdate(orderId, "accepted")}
                            >
                              <Check /> Accept
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" disabled={busy}>
                                  <X /> Reject
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reject this order?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    The customer will be notified that their order was rejected. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleUpdate(orderId, "rejected")}>
                                    Reject order
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        {!isFinal && status !== "pending" && orderId && (
                          <Select
                            value={status}
                            disabled={busy}
                            onValueChange={(v) => handleUpdate(orderId, v)}
                          >
                            <SelectTrigger className="h-9 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_FLOW.filter((s) => s !== "pending").map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {isFinal && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </ArtistDashboardLayout>
  );
};

export default ArtistOrders;