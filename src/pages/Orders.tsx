import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "outline",
  shipped: "outline",
  delivered: "default",
  rejected: "destructive",
  cancelled: "destructive",
};

type Order = {
  id: string;
  status: string;
  total_price: number;
  shipping_address: string | null;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    price: number;
    products: {
      title: string;
      images: string[] | null;
    };
  }[];
};

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(
          id,
          quantity,
          price,
          products(title, images)
        )
      `)
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load orders:", error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="container py-12">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Please log in to view your orders.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <Card>
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No orders yet. <Link to="/browse" className="text-primary hover:underline">Start shopping</Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-accent/50">
                  <TableCell>
                    <Link to={`/orders/${order.id}`} className="font-mono text-xs text-primary hover:underline">
                      #{order.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {order.order_items?.slice(0, 2).map((item) => (
                        <span key={item.id} className="text-sm truncate max-w-[200px]">
                          {item.products?.title} × {item.quantity}
                        </span>
                      ))}
                      {(order.order_items?.length || 0) > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{order.order_items.length - 2} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>${Number(order.total_price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default Orders;
