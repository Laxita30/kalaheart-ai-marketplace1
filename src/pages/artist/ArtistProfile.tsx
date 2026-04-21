import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArtistDashboardLayout from "@/components/ArtistDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createOrUpdateArtist, getMyArtist } from "@/lib/api";

const ArtistProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    getMyArtist().then((a) => {
      if (a) {
        setShopName(a.shop_name);
        setDescription(a.description ?? "");
        setPortfolio(a.portfolio_url ?? "");
      }
    });
  }, [user, authLoading, navigate]);

  const save = async () => {
    if (!shopName.trim()) { toast({ title: "Shop name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await createOrUpdateArtist({ shop_name: shopName, description, portfolio_url: portfolio });
      toast({ title: "Saved!", description: "Your shop profile is up to date." });
      navigate("/artist");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <ArtistDashboardLayout title="Shop Profile">
      <Card className="p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <Label>Shop name</Label>
            <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Maya's Pottery Studio" className="mt-1.5" />
          </div>
          <div>
            <Label>About your craft</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Tell customers about your art, techniques and inspiration." className="mt-1.5" />
          </div>
          <div>
            <Label>Portfolio URL</Label>
            <Input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://..." className="mt-1.5" />
          </div>
          <Button onClick={save} disabled={saving} size="lg">{saving ? "Saving..." : "Save profile"}</Button>
        </div>
      </Card>
    </ArtistDashboardLayout>
  );
};

export default ArtistProfile;