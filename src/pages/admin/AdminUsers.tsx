import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Ban, CheckCircle2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Row = {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  blocked: boolean;
  roles: string[];
};

const AdminUsers = () => {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name, created_at, blocked")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byUser: Record<string, string[]> = {};
    (roles ?? []).forEach((r: any) => {
      byUser[r.user_id] = [...(byUser[r.user_id] ?? []), r.role];
    });
    setRows(
      (profiles ?? []).map((p: any) => ({ ...p, roles: byUser[p.user_id] ?? [] })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleBlock = async (row: Row) => {
    setBusyId(row.user_id);
    const { error } = await supabase
      .from("profiles")
      .update({ blocked: !row.blocked })
      .eq("user_id", row.user_id);
    setBusyId(null);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: row.blocked ? "Account unblocked" : "Account blocked" });
    setRows((prev) =>
      prev.map((r) => (r.user_id === row.user_id ? { ...r, blocked: !row.blocked } : r)),
    );
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.email, r.first_name, r.last_name].filter(Boolean).some((v) =>
        (v as string).toLowerCase().includes(term),
      ),
    );
  }, [rows, q]);

  return (
    <AdminLayout title="Users">
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9"
        />
      </div>

      <Card>
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No users found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const isSelf = r.user_id === me?.id;
                const isAdmin = r.roles.includes("admin");
                const disabled = busyId === r.user_id || isSelf || isAdmin;
                return (
                  <TableRow key={r.user_id} className={r.blocked ? "opacity-70" : undefined}>
                    <TableCell>
                      {[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {r.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          r.roles.map((role) => (
                            <Badge key={role} variant={role === "admin" ? "default" : "secondary"}>
                              {role}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.blocked ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {r.blocked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disabled}
                          onClick={() => toggleBlock(r)}
                        >
                          <CheckCircle2 /> Unblock
                        </Button>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" disabled={disabled}>
                              <Ban /> Block
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Block this account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {r.email} will be flagged as blocked. You can unblock them at any time.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => toggleBlock(r)}>
                                Block account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </AdminLayout>
  );
};

export default AdminUsers;
