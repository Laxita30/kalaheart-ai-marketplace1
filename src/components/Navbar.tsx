import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, User, LogOut } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import NotificationsBell from "@/components/NotificationsBell";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const isLanding = location.pathname === "/";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="KalaHeart" className="h-8 w-8" />
          <span className="text-xl font-bold font-display text-primary">KalaHeart</span>
        </Link>

        {isLanding && !user ? (
          <>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <a href="#mission" className="text-foreground/70 hover:text-foreground transition-colors">{t("nav.mission")}</a>
              <a href="#products" className="text-foreground/70 hover:text-foreground transition-colors">{t("nav.products")}</a>
              <a href="#artisans" className="text-foreground/70 hover:text-foreground transition-colors">{t("nav.artists")}</a>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <Link to="/login">
                <Button>{t("nav.login")}</Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {user && <NotificationsBell />}
            {!isLanding && (
              <>
                <Link to="/favorites" className="text-foreground/60 hover:text-foreground transition-colors">
                  <Heart className="h-5 w-5" />
                </Link>
                <Link to="/cart" className="text-foreground/60 hover:text-foreground transition-colors">
                  <ShoppingCart className="h-5 w-5" />
                </Link>
              </>
            )}
            {user ? (
              <button onClick={handleSignOut} className="text-foreground/60 hover:text-foreground transition-colors" title="Sign out">
                <LogOut className="h-5 w-5" />
              </button>
            ) : (
              <Link to="/login" className="text-foreground/60 hover:text-foreground transition-colors">
                <User className="h-5 w-5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
