import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, User, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast({ title: "Please agree to Terms", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, { first_name: firstName, last_name: lastName, phone, address });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "Check your email to verify your account." });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-lg">
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
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
