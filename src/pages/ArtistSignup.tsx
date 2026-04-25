import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Palette,
  Mic, MicOff, Sparkles, Upload, Image as ImageIcon, FileCheck2, Check, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const [step, setStep] = useState(1);

  // Step 1: account
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: shop + AI story
  const [shopName, setShopName] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [rawNotes, setRawNotes] = useState("");
  const [aiStory, setAiStory] = useState("");
  const [generatingStory, setGeneratingStory] = useState(false);
  const speech = useSpeechRecognition(language);

  // Step 3: uploads
  const [idProof, setIdProof] = useState<File | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/.test(password),
  }), [password]);
  const passwordValid = Object.values(passwordChecks).every(Boolean);

  // Sync speech transcript into the notes field
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
      toast({ title: "Add some notes first", description: "Type or speak about your craft.", variant: "destructive" });
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
      toast({ title: "Story generated!", description: "Edit it freely before submitting." });
    } catch (e: any) {
      toast({ title: "Could not generate story", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingStory(false);
    }
  };

  const goNext = () => {
    if (step === 1) {
      if (!firstName || !email || !passwordValid) {
        toast({ title: "Please complete all fields", description: "Password must meet all criteria.", variant: "destructive" });
        return;
      }
    }
    if (step === 2) {
      if (!shopName.trim()) {
        toast({ title: "Shop name required", variant: "destructive" });
        return;
      }
      if (!aiStory.trim()) {
        toast({ title: "Generate or write your story before continuing", variant: "destructive" });
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const uploadFile = async (bucket: string, userId: string, file: File) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw error;
    if (bucket === "artist-ids") {
      // private bucket: store path only
      return path;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const submit = async () => {
    if (!idProof || !profilePhoto) {
      toast({ title: "Both ID proof and profile photo are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create auth account
      const { error: signErr } = await signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
        phone,
        address,
      });
      if (signErr) throw signErr;

      // 2. Sign in immediately so we can upload + insert (auto-confirm assumed; if not, user must confirm)
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr) {
        toast({
          title: "Account created — please verify your email",
          description: "After verifying, log in and complete your shop submission from your dashboard.",
        });
        navigate("/login");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Could not establish session");

      // 3. Upload files
      const idPath = await uploadFile("artist-ids", user.id, idProof);
      const photoUrl = await uploadFile("artist-photos", user.id, profilePhoto);

      // 4. Insert artist row (review_status defaults to pending)
      const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";
      const { error: insertErr } = await supabase.from("artists").insert({
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
      } as any);
      if (insertErr) throw insertErr;

      toast({
        title: "Submitted for review!",
        description: "An admin will review your shop shortly. You can sign in to track status.",
      });
      navigate("/artist");
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-500/5 via-background to-pink-500/5 p-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {n}
              </div>
              {n < 3 && <div className={`h-0.5 w-12 ${step > n ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Palette className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">
                {step === 1 && "Create your artisan account"}
                {step === 2 && "Tell us your story"}
                {step === 3 && "Verify your identity"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {step === 1 && "We'll set up your shop in just a few steps."}
                {step === 2 && "Use voice or text — our AI will polish it in your language."}
                {step === 3 && "Upload your ID and a profile photo for admin review."}
              </p>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-10" placeholder="Maya" />
                  </div>
                </div>
                <div>
                  <Label>Last name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="pl-10" placeholder="Patel" />
                  </div>
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" placeholder="+91 ..." />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} className="pl-10" placeholder="City, Country" />
                  </div>
                </div>
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative mt-1.5">
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
                    onClick={() => setShowPassword(!showPassword)}
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
                      <li key={c.label} className={`flex items-center gap-1.5 ${c.ok ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}`}>
                        {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Shop name</Label>
                <Input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="mt-1.5"
                  placeholder="e.g. Maya's Pottery Studio"
                />
              </div>
              <div>
                <Label>Story language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Your raw notes (text or voice)</Label>
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
                  placeholder="Tell us about your craft, materials, inspiration, heritage…"
                />
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
              >
                {generatingStory ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating with AI…</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate my story with AI</>
                )}
              </Button>
              {aiStory && (
                <div>
                  <Label>Your story (editable)</Label>
                  <Textarea
                    rows={7}
                    value={aiStory}
                    onChange={(e) => setAiStory(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <FileDrop
                label="Government ID proof"
                hint="PDF, JPG or PNG. Kept private — only you and admins can view."
                Icon={FileCheck2}
                file={idProof}
                accept="image/*,application/pdf"
                onFile={setIdProof}
              />
              <FileDrop
                label="Your profile photo"
                hint="Shown on your shop page."
                Icon={ImageIcon}
                file={profilePhoto}
                accept="image/*"
                onFile={setProfilePhoto}
              />
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                After submission, an admin will review your application. You'll get a notification when your shop is approved.
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <Button onClick={goNext}>Continue</Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <><Upload className="h-4 w-4" /> Submit for review</>
                )}
              </Button>
            )}
          </div>
        </Card>

        <p className="text-center mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
};

const FileDrop = ({
  label, hint, Icon, file, accept, onFile,
}: {
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
  file: File | null;
  accept: string;
  onFile: (f: File | null) => void;
}) => (
  <div>
    <Label>{label}</Label>
    <label className="mt-1.5 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/40 transition-colors">
      <Icon className="h-8 w-8 text-muted-foreground" />
      {file ? (
        <div className="text-sm text-foreground font-medium">{file.name}</div>
      ) : (
        <>
          <div className="text-sm font-medium">Click to upload</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </>
      )}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  </div>
);

export default ArtistSignup;