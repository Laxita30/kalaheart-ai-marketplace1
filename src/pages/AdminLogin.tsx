import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // One-time idempotent seed of the default admin account
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await supabase.functions.invoke("seed-admin");
      } catch (e) {
        console.error("admin seed failed", e);
      } finally {
        if (!cancelled) setSeeded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setLoading(false);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    // Verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast({ title: "Login failed", variant: "destructive" });
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    setLoading(false);
    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      toast({
        title: "Access denied",
        description: "This account does not have admin privileges.",
        variant: "destructive",
      });
      return;
    }
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500/5 via-background to-violet-500/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-display font-bold text-center">Admin Console</h1>
        <p className="text-center text-muted-foreground mt-2 text-sm">
          Restricted access. Authorized administrators only.
        </p>

        <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
          <p className="font-semibold text-foreground">Default admin credentials</p>
          <p className="text-muted-foreground mt-0.5">
            Email: <span className="font-mono">admin@example.com</span><br/>
            Password: <span className="font-mono">Admin@123</span>
          </p>
          {!seeded && <p className="text-muted-foreground mt-1 italic">Preparing admin account…</p>}
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="admin@example.com"
                className="pl-10"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter your admin password"
                className="pl-10 pr-10"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Login to Admin"}
          </Button>
        </form>

        <p className="text-center mt-6 text-xs text-muted-foreground">
          Not an admin?{" "}
          <Link to="/welcome" className="text-primary hover:underline">
            Go back to role selection
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;