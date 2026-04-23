import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "artist_approved"
  | "artist_revoked"
  | "product_hidden"
  | "product_activated"
  | "product_deleted";

export async function logAdminAction(params: {
  action: AuditAction;
  target_type: "artist" | "product";
  target_id: string;
  details?: Record<string, unknown>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await (supabase.from("admin_audit_log") as any).insert({
    actor_id: user.id,
    action: params.action,
    target_type: params.target_type,
    target_id: params.target_id,
    details: params.details ?? null,
  });
}
