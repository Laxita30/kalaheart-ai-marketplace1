import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/lib/adminAudit";
import { CheckCircle2, XCircle, FileText, Eye } from "lucide-react";

type Submission = {
  id: string;
  user_id: string;
  shop_name: string;
  description: string | null;
  ai_story: string | null;
  story_language: string | null;
  id_proof_url: string | null;
  profile_photo_url: string | null;
  approved: boolean;
  review_status: string;
  review_notes: string | null;
  submitted_at: string | null;
  created_at: string;
};

const AdminArtistReview = () => {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [openSubmission, setOpenSubmission] = useState<Submission | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [acting, setActing] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    let query = supabase.from("artists").select("*").order("submitted_at", { ascending: false, nullsFirst: false });
    if (filter !== "all") query = query.eq("review_status", filter);
    const { data } = await query;
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const openReview = async (s: Submission) => {
    setOpenSubmission(s);
    setReviewNotes(s.review_notes ?? "");
  };

  const downloadIdProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("artist-ids").createSignedUrl(path, 60);
    if (error || !data) {
      toast({ title: "Could not load ID", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const decide = async (decision: "approved" | "rejected") => {
    if (!openSubmission) return;
    setActing(true);
    try {
      const { error } = await supabase
        .from("artists")
        .update({
          review_status: decision,
          review_notes: reviewNotes || null,
          approved: decision === "approved",
        } as any)
        .eq("id", openSubmission.id);
      if (error) throw error;

      // Ensure role membership matches the decision so the artist
      // immediately gains (or loses) access to artist-only features.
      if (decision === "approved") {
        await supabase
          .from("user_roles")
          .upsert(
            { user_id: openSubmission.user_id, role: "artist" as any },
            { onConflict: "user_id,role" } as any,
          );
      } else {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", openSubmission.user_id)
          .eq("role", "artist" as any);
      }

      await logAdminAction({
        action: decision === "approved" ? "artist_approved" : "artist_revoked",
        target_type: "artist",
        target_id: openSubmission.id,
        details: {
          shop_name: openSubmission.shop_name,
          before: { review_status: openSubmission.review_status, approved: openSubmission.approved },
          after: { review_status: decision, approved: decision === "approved" },
          notes: reviewNotes || null,
        },
      });

      // Notify the artist
      await supabase.from("notifications").insert({
        user_id: openSubmission.user_id,
        type: decision === "approved" ? "order_accepted" : "order_rejected",
        title: decision === "approved" ? "Your shop is approved 🎉" : "Application not approved",
        body:
          decision === "approved"
            ? `Welcome to KalaHeart! Your shop "${openSubmission.shop_name}" is live.`
            : reviewNotes || "Please review the feedback and resubmit.",
        link: "/artist",
      });

      toast({
        title: decision === "approved" ? "Artist approved" : "Application rejected",
      });
      setOpenSubmission(null);
      load();
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge>Approved</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <AdminLayout title="Artist applications">
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading…</Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No {filter !== "all" ? filter : ""} applications.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((s) => (
            <Card key={s.id} className="p-5 flex gap-4">
              {s.profile_photo_url ? (
                <img
                  src={s.profile_photo_url}
                  alt={s.shop_name}
                  className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold truncate">{s.shop_name}</h3>
                  {statusBadge(s.review_status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                  {s.story_language && ` • ${s.story_language}`}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{s.ai_story ?? s.description ?? "No story provided"}</p>
                <Button size="sm" className="mt-3" onClick={() => openReview(s)}>
                  <Eye className="h-4 w-4" /> Review
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!openSubmission} onOpenChange={(v) => !v && setOpenSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {openSubmission && (
            <>
              <DialogHeader>
                <DialogTitle>{openSubmission.shop_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  {openSubmission.profile_photo_url && (
                    <img
                      src={openSubmission.profile_photo_url}
                      alt="Artist"
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 text-sm">
                    <div>{statusBadge(openSubmission.review_status)}</div>
                    <p className="text-muted-foreground mt-2">
                      Submitted{" "}
                      {openSubmission.submitted_at
                        ? new Date(openSubmission.submitted_at).toLocaleString()
                        : "—"}
                    </p>
                    {openSubmission.story_language && (
                      <p className="text-muted-foreground">Language: {openSubmission.story_language}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Story</h4>
                  <p className="text-sm whitespace-pre-line bg-muted/40 rounded-lg p-3">
                    {openSubmission.ai_story ?? openSubmission.description ?? "—"}
                  </p>
                </div>
                {openSubmission.id_proof_url && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => downloadIdProof(openSubmission.id_proof_url!)}
                  >
                    <FileText className="h-4 w-4" /> View ID proof
                  </Button>
                )}
                <div>
                  <h4 className="font-semibold text-sm mb-1">Review notes (sent to artist if rejected)</h4>
                  <Textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional notes for the artist…"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="destructive" onClick={() => decide("rejected")} disabled={acting}>
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button onClick={() => decide("approved")} disabled={acting}>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminArtistReview;