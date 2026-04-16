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
