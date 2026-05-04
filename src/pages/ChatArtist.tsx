import { useEffect, useRef, useState } from "react";
import { useParams, Navigate, useLocation } from "react-router-dom";
import { Send, Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Msg = { id: string; sender_id: string; content: string; created_at: string };

const ChatArtist = () => {
  const { artistUserId } = useParams();
  const location = useLocation();
  const prefillProduct = (location.state as any)?.product as
    | { id: string; title: string; price: number; currency: string; image?: string; url: string }
    | undefined;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [artistName, setArtistName] = useState<string>("Artist");
  const [artistId, setArtistId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [prefillApplied, setPrefillApplied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !artistUserId) return;
    (async () => {
      try {
        const { data: artist } = await supabase
          .from("artists")
          .select("id, shop_name")
          .eq("user_id", artistUserId)
          .maybeSingle();
        if (artist) {
          setArtistName(artist.shop_name);
          setArtistId(artist.id);
        }

        const { data: existing } = await supabase
          .from("chat_threads")
          .select("id")
          .eq("user_id", user.id)
          .eq("artist_user_id", artistUserId)
          .maybeSingle();

        let tid = existing?.id ?? null;
        if (!tid) {
          const { data: created, error } = await supabase
            .from("chat_threads")
            .insert({
              user_id: user.id,
              artist_user_id: artistUserId,
              artist_id: artist?.id ?? null,
            })
            .select("id")
            .single();
          if (error) throw error;
          tid = created.id;
        }
        setThreadId(tid);
      } catch (e: any) {
        toast({ title: "Could not open chat", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [user, artistUserId, toast]);

  useEffect(() => {
    if (!threadId) return;
    supabase
      .from("chat_messages")
      .select("id, sender_id, content, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMsgs((data ?? []) as Msg[]));

    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  // Pre-fill the message box with product context the first time the chat opens
  useEffect(() => {
    if (!prefillProduct || prefillApplied) return;
    const draft =
      `Hi! I'm interested in your product:\n` +
      `• ${prefillProduct.title}\n` +
      `• Price: ${prefillProduct.currency}${Number(prefillProduct.price).toFixed(2)}\n` +
      `• Link: ${prefillProduct.url}\n\n` +
      `Could you share more details?`;
    setText((prev) => (prev ? prev : draft));
    setPrefillApplied(true);
  }, [prefillProduct, prefillApplied]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    if (!text.trim() || !threadId || !user) return;
    setBusy(true);
    const content = text.trim().slice(0, 2000);
    setText("");
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({ thread_id: threadId, sender_id: user.id, content });
      if (error) throw error;
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-3xl">
        <Link
          to={artistId ? `/browse` : "/browse"}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-display font-bold">Chat with {artistName}</h1>

        {prefillProduct && (
          <div className="mt-3 flex items-center gap-3 rounded-md border bg-card p-3">
            {prefillProduct.image && (
              <img
                src={prefillProduct.image}
                alt={prefillProduct.title}
                className="h-14 w-14 rounded-md object-cover border"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">About product</p>
              <p className="text-sm font-medium truncate">{prefillProduct.title}</p>
              <p className="text-sm text-price font-semibold">
                {prefillProduct.currency}
                {Number(prefillProduct.price).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <span>
            For your safety, all conversations between buyers and artists are logged and may be reviewed by admin
            moderators. Do not share payment details or personal data outside the platform.
          </span>
        </div>

        <Card className="mt-4 flex flex-col h-[60vh]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && (
              <p className="text-center text-sm text-muted-foreground">Loading…</p>
            )}
            {!loading && msgs.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Say hello — start the conversation!
              </p>
            )}
            {msgs.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      mine ? "bg-primary text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    {m.content}
                    <div className="text-[10px] opacity-70 mt-1">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t p-3 flex gap-2"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              maxLength={2000}
              disabled={busy || !threadId}
            />
            <Button type="submit" disabled={busy || !text.trim() || !threadId} className="gap-1">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </form>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default ChatArtist;