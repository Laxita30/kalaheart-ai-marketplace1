import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type Entry = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  artist_approved: "default",
  artist_revoked: "secondary",
  product_activated: "default",
  product_hidden: "secondary",
  product_deleted: "destructive",
};

const ACTION_LABEL: Record<string, string> = {
  artist_approved: "Approved artist",
  artist_revoked: "Revoked artist",
  product_activated: "Activated product",
  product_hidden: "Hid product",
  product_deleted: "Deleted product",
};

const AdminAuditLog = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [actors, setActors] = useState<Record<string, { email: string | null; first_name: string | null; last_name: string | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("admin_audit_log") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      const list = (data ?? []) as Entry[];
      setEntries(list);
      const ids = Array.from(new Set(list.map((e) => e.actor_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, email, first_name, last_name")
          .in("user_id", ids);
        const map: typeof actors = {};
        (profs ?? []).forEach((p: any) => {
          map[p.user_id] = { email: p.email, first_name: p.first_name, last_name: p.last_name };
        });
        setActors(map);
      }
      setLoading(false);
    })();
  }, []);

  const labelFor = (a: Entry) => {
    const p = actors[a.actor_id];
    if (!p) return a.actor_id.slice(0, 8);
    return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || a.actor_id.slice(0, 8);
  };

  return (
    <AdminLayout title="Audit log">
      <Card>
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No admin actions recorded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</TableCell>
                  <TableCell>{labelFor(e)}</TableCell>
                  <TableCell>
                    <Badge variant={ACTION_VARIANT[e.action] ?? "outline"}>
                      {ACTION_LABEL[e.action] ?? e.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{e.target_type}</span>{" "}
                    <span className="font-mono text-xs">#{(e.target_id ?? "").slice(0, 8)}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {e.details ? (typeof e.details === "object" ? JSON.stringify(e.details) : String(e.details)) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AdminLayout>
  );
};

export default AdminAuditLog;
