import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminArtists = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("artists").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleApproval = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("artists").update({ approved: !approved }).eq("id", id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !approved ? "Artist approved" : "Approval revoked" });
      load();
    }
  };

  return (
    <AdminLayout title="Artists">
      <Card>
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No artists yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.shop_name}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{a.description ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={a.approved ? "default" : "secondary"}>
                      {a.approved ? "Approved" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant={a.approved ? "outline" : "default"} onClick={() => toggleApproval(a.id, a.approved)}>
                      {a.approved ? "Revoke" : "Approve"}
                    </Button>
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

export default AdminArtists;
