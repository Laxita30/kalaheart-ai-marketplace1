import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { LayoutDashboard, Package, Users, ShoppingBag, Palette } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import Navbar from "@/components/Navbar";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const items = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Artists", url: "/admin/artists", icon: Palette },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Orders", url: "/admin/orders", icon: ShoppingBag },
];

const AdminLayout = ({ title, children }: { title: string; children: ReactNode }) => {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin
          </p>
          {items.map((it) => (
            <NavLink
              key={it.url}
              to={it.url}
              end={it.end}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/70 hover:bg-accent hover:text-foreground transition-colors"
              activeClassName="bg-accent text-foreground font-medium"
            >
              <it.icon className="h-4 w-4" />
              {it.title}
            </NavLink>
          ))}
        </aside>
        <main>
          <h1 className="text-2xl font-bold mb-6">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
