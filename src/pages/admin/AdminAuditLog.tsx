import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon, Search, X } from "lucide-react";

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

const ALL_ACTIONS = Object.keys(ACTION_LABEL);

const AdminAuditLog = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [actors, setActors] = useState<Record<string, { email: string | null; first_name: string | null; last_name: string | null }>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("admin_audit_log") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
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

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        search.trim().length === 0 ||
        labelFor(e).toLowerCase().includes(search.toLowerCase()) ||
        (ACTION_LABEL[e.action] ?? e.action).toLowerCase().includes(search.toLowerCase()) ||
        e.target_type.toLowerCase().includes(search.toLowerCase()) ||
        (e.target_id ?? "").toLowerCase().includes(search.toLowerCase());

      const matchesAction = selectedActions.length === 0 || selectedActions.includes(e.action);

      const entryDate = new Date(e.created_at);
      const matchesDateFrom = !dateFrom || isWithinInterval(entryDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo ?? new Date(8640000000000000)) });
      const matchesDateTo = !dateTo || isWithinInterval(entryDate, { start: startOfDay(dateFrom ?? new Date(0)), end: endOfDay(dateTo) });

      return matchesSearch && matchesAction && matchesDateFrom && matchesDateTo;
    });
  }, [entries, search, selectedActions, dateFrom, dateTo, actors]);

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedActions([]);
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = search || selectedActions.length > 0 || dateFrom || dateTo;

  return (
    <AdminLayout title="Audit log">
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search admin, action, target..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ALL_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => toggleAction(action)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedActions.includes(action)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {ACTION_LABEL[action]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-auto justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-auto justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="mr-1 h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Showing {filteredEntries.length} of {entries.length} entries
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {hasFilters ? "No entries match your filters." : "No admin actions recorded yet."}
          </div>
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
              {filteredEntries.map((e) => (
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
