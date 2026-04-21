import { supabase } from "@/integrations/supabase/client";

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
