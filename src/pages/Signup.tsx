import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, MapPin, Phone, Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordChecks = useMemo(() => {
    return {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/.test(password),
    };
  }, [password]);
  const passwordValid = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast({ title: "Please agree to Terms", variant: "destructive" });
      return;
    }
    if (!passwordValid) {
      toast({ title: "Password doesn't meet criteria", variant: "destructive" });
      return;
    }
    if (age && (Number(age) < 13 || Number(age) > 120)) {
      toast({ title: "Please enter a valid age (13-120)", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      phone,
      address,
      age: age || "",
      gender: gender || "",
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "Check your email to verify your account." });
      const redirect = window.location.search; // forward ?redirect=... to login
      navigate(`/login${redirect}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border bg-card p-8 shadow-lg my-8">
        <h1 className="text-3xl font-display font-bold text-center">Create Your KalaHeart Account</h1>
        <p className="text-center text-muted-foreground mt-2 text-sm">Join our community of artists and art lovers.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="First name" className="pl-10" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Last Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Last name" className="pl-10" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Age</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. 28"
                  className="pl-10"
                  type="number"
                  min={13}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Gender</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="non_binary">Non-binary</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Your full address" className="pl-10" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="your@example.com" className="pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="+1 (555) 123-4567" className="pl-10" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Create a strong password"
                className="pl-10 pr-10"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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

          <div className="flex items-center gap-2">
            <Checkbox id="terms" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
            <label htmlFor="terms" className="text-sm">
              I agree to the <a href="#" className="text-primary hover:underline">Terms and Conditions</a>
            </label>
          </div>

          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <p className="text-center mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
