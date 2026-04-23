import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Truck, MapPin } from "lucide-react";
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

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  products: {
    title: string;
    images: string[] | null;
    description: string | null;
  };
};

type Order = {
  id: string;
  status: string;
  total_price: number;
  shipping_address: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
};

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    loadOrder();
  }, [user, id]);

  const loadOrder = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(
          id,
          quantity,
          price,
          products(title, images, description)
        )
      `)
      .eq("id", id)
      .eq("user_id", user?.id)
      .single();

    if (error) {
      console.error("Failed to load order:", error);
    } else {
      setOrder(data as Order);
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="container py-12">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Please log in to view order details.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container py-12">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading order details...</p>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-12">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Order not found.</p>
          <Button asChild className="mt-4">
            <Link to="/orders">View all orders</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/orders" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-sm text-muted-foreground">
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"} className="text-sm">
            {order.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" /> Order Items
            </h2>
            <div className="space-y-4">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {item.products?.images?.[0] ? (
                      <img
                        src={item.products.images[0]}
                        alt={item.products.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.products?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      ${Number(item.price).toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold">${Number(order.total_price).toFixed(2)}</span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5" /> Shipping
            </h2>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={STATUS_VARIANT[order.status] ?? "secondary"}>{order.status}</Badge>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Shipping Address
            </h2>
            {order.shipping_address ? (
              <p className="text-sm whitespace-pre-wrap">{order.shipping_address}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No shipping address provided.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
