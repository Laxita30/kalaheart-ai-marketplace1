import { Link } from "react-router-dom";
import { ShoppingBag, Palette, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";

const roles = [
  {
    title: "I'm a Shopper",
    desc: "Discover handcrafted art from talented local artisans worldwide.",
    Icon: ShoppingBag,
    loginTo: "/login",
    signupTo: "/signup",
    accent: "from-amber-500/10 to-orange-500/10",
  },
  {
    title: "I'm an Artisan",
    desc: "Open your shop, tell your story with AI, and reach new customers.",
    Icon: Palette,
    loginTo: "/login",
    signupTo: "/artist/signup",
    accent: "from-rose-500/10 to-pink-500/10",
  },
  {
    title: "I'm an Admin",
    desc: "Moderate the marketplace, review artisans, and manage the platform.",
    Icon: Shield,
    loginTo: "/admin/login",
    signupTo: null,
    accent: "from-indigo-500/10 to-violet-500/10",
  },
];

const RoleSelect = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <section className="container py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold">Welcome to KalaHeart</h1>
        <p className="mt-4 text-muted-foreground">Choose how you want to enter the marketplace.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {roles.map(({ title, desc, Icon, loginTo, signupTo, accent }) => (
          <Card
            key={title}
            className={`p-8 bg-gradient-to-br ${accent} hover:shadow-xl transition-all border-2 hover:border-primary/30`}
          >
            <div className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center shadow-sm mb-5">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground min-h-[3rem]">{desc}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to={loginTo}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Login
              </Link>
              {signupTo && (
                <Link
                  to={signupTo}
                  className="inline-flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted"
                >
                  Create account
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
    <Footer />
  </div>
);

export default RoleSelect;