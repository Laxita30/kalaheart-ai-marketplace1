import { useEffect, useMemo, useState } from "react";
import ArtistDashboardLayout from "@/components/ArtistDashboardLayout";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ChatThreadView from "@/components/ChatThreadView";
import { cn } from "@/lib/utils";

type Thread = {
  id: string;
  user_id: string;
  last_message_at: string;
  buyer_name: string;
};

const ArtistChats = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: rows } = await supabase
        .from("chat_threads")
        .select("id, user_id, last_message_at")
        .eq("artist_user_id", user.id)
        .order("last_message_at", { ascending: false });
      const ids = (rows ?? []).map((r) => r.user_id);
      const profMap = new Map<string, string>();
      if (ids.length > 0) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { p_user_ids: ids });
        (profs ?? []).forEach((p: any) => {
          profMap.set(
            p.user_id,
            [p.first_name, p.last_name].filter(Boolean).join(" ") || "Buyer",
          );
        });
      }
      setThreads(
        (rows ?? []).map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          last_message_at: r.last_message_at,
          buyer_name: profMap.get(r.user_id) || "Buyer",
        })),
      );
      setLoading(false);
    })();
  }, [user]);

  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);

  return (
    <ArtistDashboardLayout title="Messages">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-9rem)]">
        <Card className="overflow-y-auto">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground text-center">Loading…</div>
          ) : threads.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No conversations yet.</div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b hover:bg-accent transition-colors",
                  activeId === t.id && "bg-accent",
                )}
              >
                <div className="font-medium text-sm">{t.buyer_name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(t.last_message_at).toLocaleString()}
                </div>
              </button>
            ))
          )}
        </Card>
        <div>
          {active && user ? (
            <ChatThreadView threadId={active.id} currentUserId={user.id} heightClass="h-[calc(100vh-9rem)]" />
          ) : (
            <Card className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Select a conversation to start chatting.
            </Card>
          )}
        </div>
      </div>
    </ArtistDashboardLayout>
  );
};

export default ArtistChats;