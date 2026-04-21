import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, BarChart3, Store, LogOut, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/artist", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/artist/products", label: "Products", icon: Package },
  { to: "/artist/orders", label: "Orders", icon: ShoppingBag },
  { to: "/artist/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/artist/profile", label: "Shop Profile", icon: Store },
];

const ArtistDashboardLayout = ({ children, title }: { children: ReactNode; title: string }) => {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 border-r bg-card flex flex-col">
        <Link to="/" className="flex items-center gap-2 p-5 border-b">
          <img src={logo} alt="KalaHeart" className="h-8 w-8" />
          <span className="font-display font-bold text-lg text-primary">KalaHeart</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
          <button
            onClick={async () => { await signOut(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground/70 hover:bg-accent"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b bg-card/50 flex items-center px-8">
          <h1 className="text-xl font-display font-semibold">{title}</h1>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default ArtistDashboardLayout;