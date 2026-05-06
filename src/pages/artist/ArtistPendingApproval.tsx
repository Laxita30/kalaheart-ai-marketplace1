import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Mail, RefreshCw, LogOut, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ArtistRow = {
  id: string;
  shop_name: string;
  review_status: string;
  review_notes: string | null;
  approved: boolean;
  submitted_at: string | null;
};

const ArtistPendingApproval = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<ArtistRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [lastResentAt, setLastResentAt] = useState<number | null>(null);

  const resendRequest = async () => {
    if (!user || !artist) return;
    if (lastResentAt && Date.now() - lastResentAt < 60_000) {
      toast({
        title: "Please wait a moment",
        description: "You can resend the request again in a minute.",
      });
      return;
    }
    setResending(true);
    try {
      // Bump submitted_at so the application reappears at the top of the admin queue
      const { error: updErr } = await supabase
        .from("artists")
        .update({ submitted_at: new Date().toISOString() } as any)
        .eq("id", artist.id);
      if (updErr) throw updErr;

      // Notify all admins in-app
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (admins && admins.length) {
        await supabase.from("notifications").insert(
          admins.map((a: any) => ({
            user_id: a.user_id,
            type: "system",
            title: "Artist application reminder",
            body: `${artist.shop_name} resent their application for review.`,
            link: "/admin/artists/review",
          })),
        );
      }

      setLastResentAt(Date.now());
      toast({
        title: "Request resent",
        description: "Our admin team has been notified again.",
      });
      load();
    } catch (e: any) {
      toast({
        title: "Couldn't resend",
        description: e.message ?? "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("artists")
      .select("id, shop_name, review_status, review_notes, approved, submitted_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setArtist((data as any) ?? null);
    setLoading(false);
    if (data && (data as any).review_status === "approved") {
      navigate("/artist", { replace: true });
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    load();
    // Realtime: react instantly when admin updates the row
    const channel = supabase
      .channel(`artist-status-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "artists", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as ArtistRow;
          setArtist(next);
          if (next.review_status === "approved") {
            setTimeout(() => navigate("/artist", { replace: true }), 1200);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const status = artist?.review_status ?? "pending";

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-500/10 via-background to-amber-500/10 flex items-center justify-center p-6">
      <Card className="w-full max-w-xl p-8 md:p-10 text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-6">
          <img src={logo} alt="KalaHeart" className="h-8 w-8" />
          <span className="font-display font-bold text-lg text-primary">KalaHeart</span>
        </Link>

        {loading ? (
          <p className="text-muted-foreground">Loading your application…</p>
        ) : !artist ? (
          <>
            <div className="inline-flex h-16 w-16 rounded-2xl bg-muted items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">No application found</h1>
            <p className="text-muted-foreground mb-6">
              Please submit your artist shop application to get started.
            </p>
            <Button onClick={() => navigate("/artist/signup")} size="lg">
              Start application
            </Button>
          </>
        ) : status === "approved" ? (
          <>
            <div className="inline-flex h-16 w-16 rounded-2xl bg-green-500/10 items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">You're approved! 🎉</h1>
            <p className="text-muted-foreground mb-6">Redirecting to your dashboard…</p>
            <Button onClick={() => navigate("/artist")} size="lg">
              Go to dashboard
            </Button>
          </>
        ) : status === "rejected" ? (
          <>
            <div className="inline-flex h-16 w-16 rounded-2xl bg-destructive/10 items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">Application not approved</h1>
            <p className="text-muted-foreground mb-3">
              Unfortunately, your application for{" "}
              <span className="font-medium text-foreground">{artist.shop_name}</span> wasn't
              approved at this time.
            </p>
            {artist.review_notes && (
              <div className="text-left bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Reviewer notes
                </p>
                <p className="text-sm whitespace-pre-line">{artist.review_notes}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate("/artist/signup")} size="lg">
                Resubmit application
              </Button>
              <Button variant="outline" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex h-16 w-16 rounded-2xl bg-amber-500/10 items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">Pending admin approval</h1>
            <p className="text-muted-foreground mb-2">
              Thanks for applying as{" "}
              <span className="font-medium text-foreground">{artist.shop_name}</span>!
            </p>
            <p className="text-muted-foreground mb-6">
              Our team is reviewing your details, ID proof and product photos. You'll be notified
              by email and in-app as soon as a decision is made — typically within 24–48 hours.
            </p>
            <div className="bg-muted/40 rounded-lg p-4 text-left text-sm space-y-2 mb-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                Watch your inbox for the approval email.
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4" />
                This page will update automatically when your status changes.
              </div>
              {artist.submitted_at && (
                <div className="text-xs text-muted-foreground/80">
                  Submitted {new Date(artist.submitted_at).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button variant="outline" onClick={load}>
                <RefreshCw className="h-4 w-4" /> Refresh status
              </Button>
              <Button onClick={resendRequest} disabled={resending}>
                <Send className="h-4 w-4" />
                {resending ? "Resending…" : "Resend request to admin"}
              </Button>
              <Button variant="ghost" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default ArtistPendingApproval;