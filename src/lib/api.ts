import { supabase } from "@/integrations/supabase/client";
import { logRecConversion } from "@/lib/recAnalytics";

export async function addToCart(productId: string, quantity = 1) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in");

  const { error } = await supabase
    .from("cart_items")
    .upsert(
      { user_id: user.id, product_id: productId, quantity },
      { onConflict: "user_id,product_id" }
    );
  if (error) throw error;
  // Buy-intent attribution for AI recommendations
  await logRecConversion(productId, "purchase").catch(() => {});
}

export async function removeFromCart(productId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in");

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);
  if (error) throw error;
}

export async function getCartItems() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("cart_items")
    .select("*, products(*)")
    .eq("user_id", user.id);
  if (error) throw error;
  return data || [];
}

export async function updateCartQuantity(productId: string, quantity: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in");
  if (quantity <= 0) {
    return removeFromCart(productId);
  }
  // Validate stock
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .maybeSingle();
  if (pErr) throw pErr;
  const stock = Number(product?.stock ?? 0);
  if (stock > 0 && quantity > stock) {
    throw new Error(`Only ${stock} in stock`);
  }
  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("user_id", user.id)
    .eq("product_id", productId);
  if (error) throw error;
}

export async function toggleWishlist(productId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in");

  const { data: existing } = await supabase
    .from("wishlist")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wishlist").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("wishlist").insert({ user_id: user.id, product_id: productId });
    await logRecConversion(productId, "wishlist").catch(() => {});
    return true;
  }
}

export async function getWishlistItems() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("wishlist")
    .select("*, products(*)")
    .eq("user_id", user.id);
  if (error) throw error;
  return data || [];
}

export async function getProducts(filters?: { category?: string; minPrice?: number; maxPrice?: number; search?: string }) {
  let query = supabase.from("products").select("*, artists(shop_name, user_id)");

  if (filters?.category) query = query.eq("category", filters.category);
  if (filters?.minPrice !== undefined) query = query.gte("price", filters.minPrice);
  if (filters?.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);
  if (filters?.search) query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getProduct(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*, artists(*, profiles(first_name, last_name, avatar_url))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function placeOrder(shippingAddress: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in");

  const items = await getCartItems();
  if (items.length === 0) throw new Error("Cart is empty");

  // Validate stock for every line item before charging the user
  for (const it of items as any[]) {
    const stock = Number(it.products?.stock ?? 0);
    if (stock > 0 && it.quantity > stock) {
      throw new Error(
        `${it.products?.title ?? "An item"} only has ${stock} in stock`,
      );
    }
    if (stock === 0) {
      throw new Error(`${it.products?.title ?? "An item"} is out of stock`);
    }
  }

  const total = items.reduce(
    (sum: number, it: any) => sum + Number(it.products?.price || 0) * it.quantity,
    0,
  );

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      total_price: total,
      status: "pending",
      shipping_address: shippingAddress,
    })
    .select()
    .single();
  if (orderErr) throw orderErr;

  const orderItems = items.map((it: any) => ({
    order_id: order.id,
    product_id: it.product_id,
    quantity: it.quantity,
    price: Number(it.products?.price || 0),
  }));
  const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
  if (itemsErr) throw itemsErr;

  // Clear cart
  await supabase.from("cart_items").delete().eq("user_id", user.id);

  // Conversion analytics best-effort
  for (const it of items) {
    await logRecConversion(it.product_id, "purchase").catch(() => {});
  }

  return order;
}

// ============ Artist Dashboard APIs ============

export async function getMyArtist() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createOrUpdateArtist(payload: { shop_name: string; description?: string; portfolio_url?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in");
  const existing = await getMyArtist();
  if (existing) {
    const { data, error } = await supabase
      .from("artists")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("artists")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  // assign artist role
  await supabase.from("user_roles").insert({ user_id: user.id, role: "artist" });
  return data;
}

export async function getMyProducts() {
  const artist = await getMyArtist();
  if (!artist) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createProduct(payload: {
  title: string;
  description?: string;
  price: number;
  category: string;
  stock?: number;
  images?: string[];
  materials?: string;
  dimensions?: string;
  care_instructions?: string;
}) {
  const artist = await getMyArtist();
  if (!artist) throw new Error("Create your artist profile first");
  const { data, error } = await supabase
    .from("products")
    .insert({ ...payload, artist_id: artist.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, payload: Partial<{
  title: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  images: string[];
  is_active: boolean;
  materials: string;
  dimensions: string;
  care_instructions: string;
}>) {
  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function getMyArtistOrders() {
  const artist = await getMyArtist();
  if (!artist) return [];
  // get product ids
  const { data: products } = await supabase
    .from("products")
    .select("id, title")
    .eq("artist_id", artist.id);
  const ids = (products || []).map((p) => p.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("order_items")
    .select("*, products(title, images), orders(id, status, created_at, shipping_address, user_id)")
    .in("product_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;
  // Best-effort: create an in-app notification for the buyer, respecting their preferences
  if (data?.user_id) {
    const copy = statusNotificationCopy(status);
    if (copy) {
      const prefs = await getNotificationPreferencesFor(data.user_id);
      const channel = status === "delivered" ? "inapp_delivery_events" : "inapp_order_updates";
      if (prefs[channel]) {
        await supabase.from("notifications").insert({
          user_id: data.user_id,
          type: `order_${status}`,
          title: copy.title,
          body: copy.body,
          link: `/orders/${orderId}`,
          order_id: orderId,
        });
      }
    }
  }
  return data;
}

function statusNotificationCopy(status: string) {
  switch (status) {
    case "accepted":
      return { title: "Order accepted", body: "Your order has been accepted by the artist." };
    case "rejected":
      return { title: "Order rejected", body: "Unfortunately, your order was rejected by the artist." };
    case "shipped":
      return { title: "Order shipped", body: "Your order is on its way!" };
    case "delivered":
      return { title: "Order delivered", body: "Your order has been marked as delivered. Enjoy!" };
    default:
      return null;
  }
}

// ============ Notifications ============

export async function getMyNotifications(limit = 20) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) throw error;
}

// ============ Notification preferences ============

export type NotificationPreferences = {
  inapp_order_updates: boolean;
  inapp_delivery_events: boolean;
};

const DEFAULT_PREFS: NotificationPreferences = {
  inapp_order_updates: true,
  inapp_delivery_events: true,
};

async function getNotificationPreferencesFor(userId: string): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("inapp_order_updates, inapp_delivery_events")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? DEFAULT_PREFS;
}

export async function getMyNotificationPreferences(): Promise<NotificationPreferences> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PREFS;
  return getNotificationPreferencesFor(user.id);
}

export async function updateMyNotificationPreferences(prefs: NotificationPreferences) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in");
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" });
  if (error) throw error;
}
