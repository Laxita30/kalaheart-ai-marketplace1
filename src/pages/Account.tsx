import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Account = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    age: "",
    gender: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name,last_name,email,phone,address,age,gender,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        toast({ title: "Failed to load profile", description: error.message, variant: "destructive" });
      } else if (data) {
        setForm({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          email: data.email ?? user.email ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          age: data.age?.toString() ?? "",
          gender: data.gender ?? "",
          avatar_url: data.avatar_url ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user, toast]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!user) return;
    if (!form.first_name.trim()) {
      toast({ title: "First name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        age: form.age ? parseInt(form.age, 10) : null,
        gender: form.gender.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-display font-bold text-primary mb-2">My Account</h1>
          <p className="text-muted-foreground mb-6">View and update your personal details.</p>
          <Card className="p-6">
            {loading ? (
              <div className="text-muted-foreground text-sm">Loading…</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First name</Label>
                    <Input value={form.first_name} onChange={update("first_name")} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input value={form.last_name} onChange={update("last_name")} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} disabled className="mt-1.5" />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={update("phone")} className="mt-1.5" />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input type="number" min={0} value={form.age} onChange={update("age")} className="mt-1.5" />
                  </div>
                </div>
                <div>
                  <Label>Gender</Label>
                  <Input value={form.gender} onChange={update("gender")} className="mt-1.5" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea value={form.address} onChange={update("address")} rows={3} className="mt-1.5" />
                </div>
                <div>
                  <Label>Avatar URL</Label>
                  <Input value={form.avatar_url} onChange={update("avatar_url")} placeholder="https://…" className="mt-1.5" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={save} disabled={saving} size="lg">
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => navigate(-1)}>Cancel</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;