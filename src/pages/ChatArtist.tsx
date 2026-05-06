import { useEffect, useState } from "react";
import { useParams, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatThreadView from "@/components/ChatThreadView";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
  const [loading, setLoading] = useState(true);

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

  // Auto-send a product-context message once when arriving from a product page.
  useEffect(() => {
    if (!threadId || !user || !prefillProduct) return;
    const key = `chat-prefill:${threadId}:${prefillProduct.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const draft =
      `Hi! I'm interested in your product:\n` +
      `• ${prefillProduct.title}\n` +
      `• Price: ${prefillProduct.currency}${Number(prefillProduct.price).toFixed(2)}\n` +
      `• Link: ${prefillProduct.url}\n\n` +
      `Could you share more details?`;
    supabase
      .from("chat_messages")
      .insert({ thread_id: threadId, sender_id: user.id, content: draft })
      .then(({ error }) => {
        if (error) toast({ title: "Send failed", description: error.message, variant: "destructive" });
      });
  }, [threadId, user, prefillProduct, toast]);

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

        <div className="mt-4">
          {loading || !threadId || !user ? (
            <div className="rounded-md border p-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ChatThreadView threadId={threadId} currentUserId={user.id} />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ChatArtist;