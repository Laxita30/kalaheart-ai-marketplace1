import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Truck, MapPin, CheckCircle2, Clock, CalendarClock, XCircle } from "lucide-react";
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

// Ordered lifecycle for a happy-path order. Used to drive the timeline UI.
const TIMELINE_STEPS: { key: string; label: string; description: string }[] = [
  { key: "pending", label: "Order placed", description: "We received your order." },
  { key: "accepted", label: "Accepted by artist", description: "The artist is preparing your item." },
  { key: "shipped", label: "Shipped", description: "Your order is on the way." },
  { key: "delivered", label: "Delivered", description: "Enjoy your purchase!" },
];

const stepIndex = (status: string) => {
  const i = TIMELINE_STEPS.findIndex((s) => s.key === status);
  return i === -1 ? 0 : i;
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
    // Subscribe to realtime status changes for this order
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          setOrder((prev) =>
            prev ? { ...prev, ...(payload.new as Partial<Order>) } : prev,
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
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
      .maybeSingle();

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

  const isCancelled = order.status === "rejected" || order.status === "cancelled";
  const currentStep = stepIndex(order.status);
  const placedAt = new Date(order.created_at);
  const updatedAt = new Date(order.updated_at);
  // Simple ETA model: 7 days from placement, +2 days if not yet shipped after 3 days.
  const etaDate = new Date(placedAt);
  etaDate.setDate(etaDate.getDate() + (order.status === "shipped" ? 4 : 7));
  const etaText = order.status === "delivered"
    ? `Delivered ${updatedAt.toLocaleDateString()}`
    : isCancelled
      ? "Order is no longer in transit"
      : `Estimated delivery by ${etaDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;

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
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Tracking</h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                <span>{etaText}</span>
              </div>
            </div>

            {isCancelled ? (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">Order {order.status}</p>
                  <p className="text-sm text-muted-foreground">
                    Last updated {updatedAt.toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <ol className="relative space-y-6">
                {TIMELINE_STEPS.map((step, idx) => {
                  const reached = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  // Best-effort timestamps: first step uses created_at, the latest reached step uses updated_at.
                  const ts =
                    idx === 0
                      ? placedAt
                      : isCurrent
                        ? updatedAt
                        : reached
                          ? updatedAt
                          : null;
                  return (
                    <li key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                            reached
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-background border-muted text-muted-foreground"
                          }`}
                        >
                          {reached ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        {idx < TIMELINE_STEPS.length - 1 && (
                          <div
                            className={`w-0.5 flex-1 mt-1 ${
                              idx < currentStep ? "bg-primary" : "bg-muted"
                            }`}
                            style={{ minHeight: 24 }}
                          />
                        )}
                      </div>
                      <div className="pb-4 flex-1">
                        <p className={`font-medium ${reached ? "" : "text-muted-foreground"}`}>
                          {step.label}
                          {isCurrent && (
                            <span className="ml-2 text-xs text-primary">• Current</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {ts && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {ts.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

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
                       onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb = "1"; t.src = `https://picsum.photos/seed/${encodeURIComponent(t.alt || "art")}/600/600`; } }} />
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
              <p className="text-xs text-muted-foreground pt-2">{etaText}</p>
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
