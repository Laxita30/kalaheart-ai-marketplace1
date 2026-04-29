import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Loader2, MapPin, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCartItems, removeFromCart, placeOrder, updateCartQuantity } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCartItems();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    load();
    // Pre-fill shipping address from profile
    (async () => {
      const { data } = await supabase.from("profiles").select("address").eq("user_id", user.id).maybeSingle();
      if (data?.address) setAddress(data.address);
    })();
  }, [user]);

  const remove = async (productId: string) => {
    await removeFromCart(productId);
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
    toast({ title: "Removed from cart" });
  };

  const changeQty = async (productId: string, nextQty: number) => {
    const item = items.find((i) => i.product_id === productId);
    if (!item) return;
    if (nextQty <= 0) return remove(productId);
    const stock = Number(item.products?.stock ?? 0);
    if (stock > 0 && nextQty > stock) {
      toast({ title: `Only ${stock} in stock`, variant: "destructive" });
      return;
    }
    // Optimistic update
    const prev = items;
    setItems((cur) =>
      cur.map((i) => (i.product_id === productId ? { ...i, quantity: nextQty } : i)),
    );
    try {
      await updateCartQuantity(productId, nextQty);
    } catch (e: any) {
      setItems(prev);
      toast({ title: "Could not update", description: e.message, variant: "destructive" });
    }
  };

  const total = items.reduce((s, i) => s + Number(i.products?.price || 0) * i.quantity, 0);
  const hasStockIssue = items.some((i) => {
    const stock = Number(i.products?.stock ?? 0);
    return stock === 0 || (stock > 0 && i.quantity > stock);
  });

  const handlePlace = async () => {
    if (!address.trim()) {
      toast({ title: "Add a shipping address", variant: "destructive" });
      return;
    }
    if (hasStockIssue) {
      toast({ title: "Some items are out of stock", description: "Please adjust quantities before checkout.", variant: "destructive" });
      return;
    }
    setPlacing(true);
    try {
      const order = await placeOrder(address);
      toast({ title: "Order placed!", description: `Order #${order.id.slice(0, 8)}` });
      navigate(`/orders/${order.id}`);
    } catch (e: any) {
      toast({ title: "Could not place order", description: e.message, variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/40" />
          <h1 className="text-2xl font-display font-bold mt-4">Sign in to view your cart</h1>
          <Link to="/login"><Button className="mt-6">Sign in</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-5xl">
        <h1 className="text-3xl font-display font-bold mb-6">Your Cart</h1>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h2 className="text-xl font-semibold mt-4">Your cart is empty</h2>
            <Link to="/browse"><Button className="mt-6">Browse Products</Button></Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id} className="p-4 flex gap-4">
                  <img
                    src={item.products?.images?.[0] || "/placeholder.svg"}
                    alt={item.products?.title}
                    className="h-24 w-24 rounded-md object-cover"
                  />
                  <div className="flex-1">
                    <Link to={`/product/${item.product_id}`} className="font-semibold hover:text-primary">
                      {item.products?.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => changeQty(item.product_id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="min-w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => changeQty(item.product_id, item.quantity + 1)}
                        disabled={
                          Number(item.products?.stock ?? 0) > 0 &&
                          item.quantity >= Number(item.products?.stock ?? 0)
                        }
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      {Number(item.products?.stock ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          {item.products?.stock} in stock
                        </span>
                      )}
                      {Number(item.products?.stock ?? 0) === 0 && (
                        <span className="text-xs text-destructive ml-1">Out of stock</span>
                      )}
                    </div>
                    <p className="text-price font-bold mt-2">
                      {item.products?.currency}{(Number(item.products?.price || 0) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(item.product_id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              ))}
            </div>

            <Card className="p-6 h-fit space-y-4 sticky top-6">
              <h2 className="font-semibold text-lg">Order Summary</h2>
              <div className="flex justify-between text-sm">
                <span>Subtotal</span><span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-3">
                <span>Total</span><span className="text-price">${total.toFixed(2)}</span>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Shipping address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} className="pl-10" placeholder="Where to deliver?" />
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={handlePlace} disabled={placing || hasStockIssue}>
                {placing ? <><Loader2 className="h-4 w-4 animate-spin" /> Placing…</> : "Place order"}
              </Button>
              {hasStockIssue && (
                <p className="text-xs text-destructive text-center">
                  Adjust quantities — some items exceed available stock.
                </p>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;