import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Palette,
  Mic, MicOff, Sparkles, Image as ImageIcon, FileCheck2, Check, X,
  Loader2, Camera, IdCard, Globe2, Wand2, Trash2, Plus, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "bn-IN", label: "Bengali" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "mr-IN", label: "Marathi" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "kn-IN", label: "Kannada" },
  { code: "pa-IN", label: "Punjabi" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "ja-JP", label: "Japanese" },
  { code: "zh-CN", label: "Chinese (Mandarin)" },
  { code: "ar-SA", label: "Arabic" },
];

const ArtistSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();

  // Account
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Shop + AI story
  const [shopName, setShopName] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [rawNotes, setRawNotes] = useState("");
  const [aiStory, setAiStory] = useState("");
  const [generatingStory, setGeneratingStory] = useState(false);
  const speech = useSpeechRecognition(language);

  // Uploads
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [idProof, setIdProof] = useState<File | null>(null);
  const [productPhotos, setProductPhotos] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/.test(password),
  }), [password]);
  const passwordValid = Object.values(passwordChecks).every(Boolean);

  const liveNotes = speech.transcript || rawNotes;

  const toggleMic = () => {
    if (!speech.supported) {
      toast({
        title: "Voice input not supported",
        description: "Please use Chrome or Edge, or type your notes instead.",
        variant: "destructive",
      });
      return;
    }
    if (speech.listening) {
      speech.stop();
      setRawNotes(speech.transcript);
    } else {
      speech.setExternalText(rawNotes);
      speech.start();
    }
  };

  const generateStory = async () => {
    const text = (speech.listening ? speech.transcript : rawNotes).trim();
    if (!text) {
      toast({
        title: "Add some notes first",
        description: "Type or speak about your craft and inspiration.",
        variant: "destructive",
      });
      return;
    }
    setGeneratingStory(true);
    try {
      const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";
      const { data, error } = await supabase.functions.invoke("generate-artist-story", {
        body: { rawText: text, language: langLabel, shopName },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAiStory((data as any).story ?? "");
      toast({ title: "Story generated", description: "Edit it freely before submitting." });
    } catch (e: any) {
      toast({
        title: "Could not generate story",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingStory(false);
    }
  };

  const uploadFile = async (bucket: string, userId: string, file: File) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    if (bucket === "artist-ids") return path;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const validate = () => {
    if (!firstName.trim() || !email.trim()) {
      toast({ title: "Name and email required", variant: "destructive" });
      return false;
    }
    if (!passwordValid) {
      toast({ title: "Password doesn't meet criteria", variant: "destructive" });
      return false;
    }
    if (!shopName.trim()) {
      toast({ title: "Shop name required", variant: "destructive" });
      return false;
    }
    if (!aiStory.trim()) {
      toast({
        title: "Generate or write your story",
        description: "Use voice or text and click Generate.",
        variant: "destructive",
      });
      return false;
    }
    if (!profilePhoto) {
      toast({ title: "Add an artist photo", variant: "destructive" });
      return false;
    }
    if (!idProof) {
      toast({ title: "Add an ID proof image", variant: "destructive" });
      return false;
    }
    if (productPhotos.length === 0) {
      toast({ title: "Add at least one product photo", description: "Upload photos of items you'll sell.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { error: signErr } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        phone,
        address,
      });
      if (signErr) throw signErr;

      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr) {
        toast({
          title: "Account created — please verify your email",
          description: "After verifying, log in and complete your shop submission.",
        });
        navigate("/login");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Could not establish session");

      const idPath = await uploadFile("artist-ids", user.id, idProof!);
      const photoUrl = await uploadFile("artist-photos", user.id, profilePhoto!);

      const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";
      const { data: artistRow, error: insertErr } = await supabase.from("artists").insert({
        user_id: user.id,
        shop_name: shopName,
        description: aiStory,
        ai_story: aiStory,
        story_language: langLabel,
        id_proof_url: idPath,
        profile_photo_url: photoUrl,
        approved: false,
        review_status: "pending",
        submitted_at: new Date().toISOString(),
      } as any).select().single();
      if (insertErr) throw insertErr;

      // Upload product photos and create draft products
      const productImageUrls: string[] = [];
      for (const file of productPhotos) {
        const url = await uploadFile("product-photos", user.id, file);
        productImageUrls.push(url as string);
      }
      if (artistRow && productImageUrls.length > 0) {
        const drafts = productImageUrls.map((url, i) => ({
          artist_id: artistRow.id,
          title: `Untitled product ${i + 1}`,
          description: "Pending artist details",
          price: 0,
          category: "Other",
          images: [url],
          stock: 0,
          is_active: false,
        }));
        await supabase.from("products").insert(drafts);
      }

      toast({
        title: "Submitted for review!",
        description: "An admin will review your shop shortly.",
      });
      navigate("/artist/pending");
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-500/10 via-background to-amber-500/10">
      <div className="container max-w-5xl py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-primary/10 items-center justify-center mb-4">
            <Palette className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Become a KalaHeart Artisan</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Tell us your craft story in your own voice — our AI will help shape it into something beautiful in your language.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* Section 1: Account */}
          <SectionCard
            number={1}
            icon={User}
            title="Your account"
            subtitle="So shoppers can reach you and you can manage your shop."
          >
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="First name">
                <IconInput Icon={User} value={firstName} onChange={setFirstName} placeholder="Maya" />
              </Field>
              <Field label="Last name">
                <IconInput Icon={User} value={lastName} onChange={setLastName} placeholder="Patel" />
              </Field>
            </div>
            <Field label="Email">
              <IconInput Icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            </Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Phone">
                <IconInput Icon={Phone} value={phone} onChange={setPhone} placeholder="+91 ..." />
              </Field>
              <Field label="Address">
                <IconInput Icon={MapPin} value={address} onChange={setAddress} placeholder="City, Country" />
              </Field>
            </div>
            <Field label="Password">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <ul className="mt-2 grid grid-cols-2 gap-y-1 gap-x-3 text-xs">
                  {[
                    { ok: passwordChecks.length, label: "At least 8 characters" },
                    { ok: passwordChecks.upper, label: "One uppercase letter" },
                    { ok: passwordChecks.lower, label: "One lowercase letter" },
                    { ok: passwordChecks.number, label: "One number" },
                    { ok: passwordChecks.special, label: "One special character" },
                  ].map((c) => (
                    <li
                      key={c.label}
                      className={`flex items-center gap-1.5 ${c.ok ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}`}
                    >
                      {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      {c.label}
                    </li>
                  ))}
                </ul>
              )}
            </Field>
          </SectionCard>

          {/* Section 2: Photos & ID */}
          <SectionCard
            number={2}
            icon={Camera}
            title="Your photo & verification"
            subtitle="A friendly photo for your shop, and an ID proof admins will review privately."
          >
            <div className="grid md:grid-cols-2 gap-5">
              <PhotoCard
                label="Artist photo"
                hint="Square headshot looks best."
                Icon={ImageIcon}
                file={profilePhoto}
                accept="image/*"
                onFile={setProfilePhoto}
                preview
              />
              <PhotoCard
                label="Government ID proof"
                hint="Passport, driver's license, etc. Stays private."
                Icon={IdCard}
                file={idProof}
                accept="image/*,application/pdf"
                onFile={setIdProof}
                preview
              />
            </div>
          </SectionCard>

          {/* Section 2b: Product photos */}
          <SectionCard
            number={3}
            icon={Package}
            title="Photos of your products"
            subtitle="Upload one or more photos of items you'll sell. You can add details later."
          >
            <ProductPhotoGrid files={productPhotos} onChange={setProductPhotos} />
          </SectionCard>

          {/* Section 3: AI story */}
          <SectionCard
            number={4}
            icon={Wand2}
            title="Your craft story (AI-assisted)"
            subtitle="Speak or type a few notes — pick any language. AI will craft a beautiful first-person story."
          >
            <Field label="Shop name">
              <Input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Maya's Pottery Studio"
              />
            </Field>

            <Field label="Story language">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <Globe2 className="h-4 w-4 text-muted-foreground mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Your raw notes</Label>
                <Button
                  type="button"
                  size="sm"
                  variant={speech.listening ? "destructive" : "outline"}
                  onClick={toggleMic}
                >
                  {speech.listening ? (
                    <><MicOff className="h-4 w-4" /> Stop</>
                  ) : (
                    <><Mic className="h-4 w-4" /> Speak</>
                  )}
                </Button>
              </div>
              <Textarea
                rows={4}
                value={liveNotes}
                onChange={(e) => {
                  setRawNotes(e.target.value);
                  speech.setExternalText(e.target.value);
                }}
                placeholder="Tell us about your craft, materials, inspiration, heritage… in any language."
              />
              {speech.listening && (
                <p className="text-xs text-primary mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Listening in {LANGUAGES.find((l) => l.code === language)?.label}…
                </p>
              )}
              {speech.error && <p className="text-xs text-destructive mt-1">{speech.error}</p>}
              {!speech.supported && (
                <p className="text-xs text-muted-foreground mt-1">
                  Voice input requires Chrome or Edge. You can type instead.
                </p>
              )}
            </div>

            <Button
              type="button"
              onClick={generateStory}
              disabled={generatingStory}
              className="w-full"
              variant="secondary"
              size="lg"
            >
              {generatingStory ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Crafting your story…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate my story with AI</>
              )}
            </Button>

            {aiStory && (
              <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Your story (editable)
                  </Label>
                  <span className="text-xs text-muted-foreground">{aiStory.split(/\s+/).length} words</span>
                </div>
                <Textarea
                  rows={7}
                  value={aiStory}
                  onChange={(e) => setAiStory(e.target.value)}
                  className="bg-card"
                />
              </div>
            )}
          </SectionCard>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              An admin will review your application and notify you when your shop is approved.
            </p>
            <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit for review"}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already an artisan? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

/* ---------- helpers ---------- */

const SectionCard = ({
  number, icon: Icon, title, subtitle, children,
}: {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <Card className="p-6 md:p-8">
    <div className="flex items-start gap-4 mb-6">
      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0">
        {number}
      </div>
      <div className="flex-1">
        <h2 className="text-lg md:text-xl font-display font-semibold flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </Card>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <Label className="mb-1.5 block">{label}</Label>
    {children}
  </div>
);

const IconInput = ({
  Icon, value, onChange, placeholder, type = "text",
}: {
  Icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-10"
      placeholder={placeholder}
    />
  </div>
);

const PhotoCard = ({
  label, hint, Icon, file, accept, onFile,
}: {
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
  file: File | null;
  accept: string;
  onFile: (f: File | null) => void;
  preview?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = file?.type.startsWith("image/");
  const previewUrl = useMemo(
    () => (file && isImage ? URL.createObjectURL(file) : null),
    [file, isImage],
  );

  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative w-full aspect-[4/3] rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary hover:bg-primary/5 transition-colors overflow-hidden flex flex-col items-center justify-center"
      >
        {previewUrl ? (
          <img src={previewUrl} alt={label} className="w-full h-full object-cover" />
        ) : file ? (
          <div className="flex flex-col items-center gap-2">
            <FileCheck2 className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        ) : (
          <>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-medium">Click to upload</span>
            <span className="text-xs text-muted-foreground mt-0.5">{hint}</span>
          </>
        )}
      </button>
      {file && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onFile(null); }}
          className="mt-2 text-xs text-destructive hover:underline inline-flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
};

const ProductPhotoGrid = ({
  files, onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(
    () => files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [files],
  );
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {previews.map((p, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
            <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(files.filter((_, idx) => idx !== i))}
              className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-card/90 text-destructive flex items-center justify-center hover:bg-card"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center text-muted-foreground hover:text-primary"
        >
          <Plus className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Add photo</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const newFiles = Array.from(e.target.files ?? []);
          onChange([...files, ...newFiles]);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      {files.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">{files.length} photo{files.length > 1 ? "s" : ""} selected</p>
      )}
    </div>
  );
};

export default ArtistSignup;