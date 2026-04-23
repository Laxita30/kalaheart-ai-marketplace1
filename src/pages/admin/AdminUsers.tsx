import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  roles: string[];
};

const AdminUsers = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("user_id, email, first_name, last_name, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const byUser: Record<string, string[]> = {};
      (roles ?? []).forEach((r: any) => {
        byUser[r.user_id] = [...(byUser[r.user_id] ?? []), r.role];
      });
      setRows((profiles ?? []).map((p: any) => ({ ...p, roles: byUser[p.user_id] ?? [] })));
      setLoading(false);
    })();
  }, []);

  return (
    <AdminLayout title="Users">
      <Card>
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No users.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell>{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {r.roles.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : r.roles.map((role) => (
                        <Badge key={role} variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </AdminLayout>
  );
};

export default AdminUsers;
