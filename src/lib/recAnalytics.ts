import { supabase } from "@/integrations/supabase/client";

export type RecEventType = "impression" | "click" | "wishlist" | "purchase";
export type RecSurface = "home" | "product_detail";

const ATTR_KEY = "rec_attribution_v1";
const ATTR_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

type AttrEntry = { reason: string; surface: RecSurface; sourceProductId?: string; ts: number };
type AttrMap = Record<string, AttrEntry>;

function readAttr(): AttrMap {
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AttrMap;
    const cutoff = Date.now() - ATTR_TTL_MS;
    let dirty = false;
    for (const k of Object.keys(parsed)) {
      if (!parsed[k] || parsed[k].ts < cutoff) {
        delete parsed[k];
        dirty = true;
      }
    }
    if (dirty) localStorage.setItem(ATTR_KEY, JSON.stringify(parsed));
    return parsed;
  } catch {
    return {};
  }
}

function writeAttr(map: AttrMap) {
  try {
    localStorage.setItem(ATTR_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function rememberRecommendation(
  productId: string,
  reason: string,
  surface: RecSurface,
  sourceProductId?: string,
) {
  const map = readAttr();
  map[productId] = { reason, surface, sourceProductId, ts: Date.now() };
  writeAttr(map);
}

export function getAttribution(productId: string): AttrEntry | null {
  const map = readAttr();
  return map[productId] ?? null;
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function logRecImpressions(
  productIds: string[],
  reason: string,
  surface: RecSurface,
  sourceProductId?: string,
) {
  if (productIds.length === 0) return;
  const userId = await currentUserId();
  const rows = productIds.map((pid) => ({
    user_id: userId,
    product_id: pid,
    event_type: "impression" as RecEventType,
    reason,
    surface,
    source_product_id: sourceProductId ?? null,
  }));
  await supabase.from("recommendation_events").insert(rows);
}

export async function logRecClick(
  productId: string,
  reason: string,
  surface: RecSurface,
  sourceProductId?: string,
) {
  rememberRecommendation(productId, reason, surface, sourceProductId);
  const userId = await currentUserId();
  await supabase.from("recommendation_events").insert({
    user_id: userId,
    product_id: productId,
    event_type: "click",
    reason,
    surface,
    source_product_id: sourceProductId ?? null,
  });
}

/** Fire a wishlist/purchase event if this product was previously recommended. */
export async function logRecConversion(productId: string, eventType: "wishlist" | "purchase") {
  const attr = getAttribution(productId);
  if (!attr) return;
  const userId = await currentUserId();
  await supabase.from("recommendation_events").insert({
    user_id: userId,
    product_id: productId,
    event_type: eventType,
    reason: attr.reason,
    surface: attr.surface,
    source_product_id: attr.sourceProductId ?? null,
  });
}