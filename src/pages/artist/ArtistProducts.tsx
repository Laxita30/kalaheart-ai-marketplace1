import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Upload, Loader2, Sparkles, Mic, MicOff } from "lucide-react";
import ArtistDashboardLayout from "@/components/ArtistDashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createProduct, deleteProduct, getMyProducts, updateProduct, getMyArtist } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Product = Awaited<ReturnType<typeof getMyProducts>>[number];

const empty = {
  title: "",
  description: "",
  price: "",
  category: "",
  stock: "",
  images: "",
  materials: "",
  dimensions: "",
  care_instructions: "",
};

const VOICE_LANGS: { code: string; label: string }[] = [
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "हिन्दी (Hindi)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "mr-IN", label: "मराठी (Marathi)" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "or-IN", label: "ଓଡ଼ିଆ (Odia)" },
  { code: "as-IN", label: "অসমীয়া (Assamese)" },
  { code: "ur-IN", label: "اردو (Urdu)" },
  { code: "ne-NP", label: "नेपाली (Nepali)" },
];
const STT_DEFAULT: Record<string, string> = {
  en: "en-IN", hi: "hi-IN", bn: "bn-IN", ta: "ta-IN", te: "te-IN", mr: "mr-IN",
  gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", pa: "pa-IN", or: "or-IN", as: "as-IN",
  ur: "ur-IN", ne: "ne-NP",
};

const ArtistProducts = () => {
  const [items, setItems] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [priceReasoning, setPriceReasoning] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [voiceLang, setVoiceLang] = useState<string>(
    () => STT_DEFAULT[i18n.language.split("-")[0]] || "en-IN",
  );
  const { supported: sttSupported, listening, transcript, start: startMic, stop: stopMic, reset: resetMic } =
    useSpeechRecognition(voiceLang);

  const load = async () => {
    const artist = await getMyArtist();
    if (!artist) { navigate("/artist/profile"); return; }
    setItems(await getMyProducts());
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null); setForm(empty); setOpen(true);
    setSuggestedPrice(null); setPriceReasoning(""); resetMic();
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description ?? "",
      price: String(p.price),
      category: p.category,
      stock: String(p.stock ?? 0),
      images: (p.images ?? []).join(", "),
      materials: (p as any).materials ?? "",
      dimensions: (p as any).dimensions ?? "",
      care_instructions: (p as any).care_instructions ?? "",
    });
    setOpen(true);
    setSuggestedPrice(null); setPriceReasoning(""); resetMic();
  };

  const suggestWithAI = async (extra?: { voiceTranscript?: string }) => {
    if (!form.title && !form.category && !extra?.voiceTranscript) {
      toast({ title: "Add a title, category or voice description first", variant: "destructive" });
      return;
    }
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-product-details", {
        body: {
          title: form.title,
          category: form.category,
          materials: form.materials,
          dimensions: form.dimensions,
          currentDescription: form.description,
          voiceTranscript: extra?.voiceTranscript ?? "",
          language: i18n.language,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const tags = (data.hashtags ?? []).map((h: string) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
      setForm((f) => ({ ...f, description: `${data.description}\n\n${tags}`.trim() }));
      setSuggestedPrice(Number(data.suggestedPrice));
      setPriceReasoning(data.priceReasoning ?? "");
      toast({ title: "AI suggestion ready", description: "Review and apply the suggested price below." });
    } catch (e: any) {
      toast({ title: "AI suggestion failed", description: e.message, variant: "destructive" });
    } finally {
      setSuggesting(false);
    }
  };

  const generateFromVoice = async () => {
    if (!transcript.trim()) {
      toast({ title: "Please record a voice description first", variant: "destructive" });
      return;
    }
    await suggestWithAI({ voiceTranscript: transcript });
  };

  const save = async () => {
    const imagesArr = form.images.split(",").map((s) => s.trim()).filter(Boolean);
    if (!form.title || !form.price || !form.category || !form.description || !form.stock || imagesArr.length === 0) {
      toast({ title: "Please fill all required (*) fields and add at least one photo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        stock: Number(form.stock || 0),
        images: imagesArr,
        materials: form.materials,
        dimensions: form.dimensions,
        care_instructions: form.care_instructions,
      };
      if (editing) await updateProduct(editing.id, payload);
      else await createProduct(payload);
      toast({ title: editing ? "Product updated" : "Product created" });
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("product-photos").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("product-photos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      const existing = form.images.split(",").map((s) => s.trim()).filter(Boolean);
      setForm({ ...form, images: [...existing, ...urls].join(", ") });
      toast({ title: `Uploaded ${urls.length} photo${urls.length > 1 ? "s" : ""}` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    try { await deleteProduct(p.id); toast({ title: "Deleted" }); load(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const Req = () => <span className="text-destructive">*</span>;

  return (
    <ArtistDashboardLayout title="Products">
      <Card>
        <div className="flex items-center justify-between p-4 border-b">
          <p className="text-sm text-muted-foreground">{items.length} product{items.length !== 1 && "s"}</p>
          <Button onClick={openNew}><Plus className="h-4 w-4" /> New product</Button>
        </div>
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No products yet. Create your first listing.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>${Number(p.price).toFixed(2)}</TableCell>
                  <TableCell>{p.stock ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Hidden"}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("product.editTitle") : t("product.newTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t("product.title")} <Req /></Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{t("product.description")} <Req /></Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="rounded-md border border-dashed p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{t("product.voiceDescribe")}</span>
                {sttSupported ? (
                  <Button
                    type="button" size="sm"
                    variant={listening ? "destructive" : "outline"}
                    onClick={listening ? stopMic : startMic}
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {listening ? t("product.listening") : t("product.voiceDescribe")}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Voice input is not supported in this browser. Try Chrome or Edge.
                  </span>
                )}
              </div>
              {sttSupported && (
                <Select value={voiceLang} onValueChange={(v) => { if (!listening) setVoiceLang(v); }} disabled={listening}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Voice language" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {VOICE_LANGS.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {transcript && <p className="text-xs text-muted-foreground italic">"{transcript}"</p>}
              <Button
                type="button" size="sm" variant="secondary" className="w-full"
                disabled={suggesting || !transcript.trim()}
                onClick={generateFromVoice}
              >
                {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t("product.generateFromVoice")}
              </Button>
            </div>

            <Button
              type="button" variant="outline" size="sm"
              onClick={() => suggestWithAI()} disabled={suggesting} className="w-full"
            >
              {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {suggesting ? t("product.generating") : t("product.suggestAi")}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("product.price")} <Req /></Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">{t("product.stock")} <Req /></Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
            </div>
            {suggestedPrice !== null && (
              <div className="flex items-start justify-between gap-2 rounded-md border border-dashed p-2 text-sm">
                <div>
                  <div className="font-medium">Suggested price: ${suggestedPrice.toFixed(2)}</div>
                  {priceReasoning && <div className="text-xs text-muted-foreground">{priceReasoning}</div>}
                </div>
                <Button type="button" size="sm" variant="secondary"
                  onClick={() => setForm({ ...form, price: suggestedPrice.toFixed(2) })}>
                  Apply
                </Button>
              </div>
            )}
            <div>
              <Label className="text-xs">{t("product.category")} <Req /></Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <Input placeholder={t("product.materials")} value={form.materials}
              onChange={(e) => setForm({ ...form, materials: e.target.value })} />
            <Input placeholder={t("product.dimensions")} value={form.dimensions}
              onChange={(e) => setForm({ ...form, dimensions: e.target.value })} />
            <Textarea placeholder={t("product.care")} value={form.care_instructions}
              onChange={(e) => setForm({ ...form, care_instructions: e.target.value })} />
            <div>
              <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                <span className="text-sm font-medium">
                  {uploading ? "Uploading…" : t("product.uploadPhotos")} <Req />
                </span>
                <span className="text-xs text-muted-foreground">{t("product.uploadHint")}</span>
                <input type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => uploadPhotos(e.target.files)} />
              </label>
              <Input placeholder={t("product.pasteUrls")} className="mt-2"
                value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ArtistDashboardLayout>
  );
};

export default ArtistProducts;