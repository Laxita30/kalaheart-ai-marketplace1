import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Chatbot from "@/components/Chatbot";
import RequireAuth from "@/components/RequireAuth";
import BackButton from "@/components/BackButton";
import AutoTranslator from "@/i18n/AutoTranslator";
import Index from "./pages/Index";
import BrowseProducts from "./pages/BrowseProducts";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RoleSelect from "./pages/RoleSelect";
import AdminLogin from "./pages/AdminLogin";
import ArtistSignup from "./pages/ArtistSignup";
import Cart from "./pages/Cart";
import Favorites from "./pages/Favorites";
import Account from "./pages/Account";
import NotificationPreferencesPage from "./pages/NotificationPreferences";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import OrderReview from "./pages/OrderReview";
import ChatArtist from "./pages/ChatArtist";
import NotFound from "./pages/NotFound";
import ArtistOverview from "./pages/artist/ArtistOverview";
import ArtistProducts from "./pages/artist/ArtistProducts";
import ArtistOrders from "./pages/artist/ArtistOrders";
import ArtistAnalytics from "./pages/artist/ArtistAnalytics";
import ArtistProfile from "./pages/artist/ArtistProfile";
import ArtistPendingApproval from "./pages/artist/ArtistPendingApproval";
import ArtistChats from "./pages/artist/ArtistChats";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminArtists from "./pages/admin/AdminArtists";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminArtistReview from "./pages/admin/AdminArtistReview";
import AdminChats from "./pages/admin/AdminChats";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AutoTranslator />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/welcome" element={<RoleSelect />} />
            <Route path="/browse" element={<BrowseProducts />} />
            <Route path="/product/:id" element={<RequireAuth><ProductDetail /></RequireAuth>} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/artist/signup" element={<ArtistSignup />} />
            <Route path="/artist/pending" element={<ArtistPendingApproval />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="/settings/notifications" element={<NotificationPreferencesPage />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/orders/:id/review" element={<RequireAuth><OrderReview /></RequireAuth>} />
            <Route path="/chat/:artistUserId" element={<ChatArtist />} />
            <Route path="/artist" element={<ArtistOverview />} />
            <Route path="/artist/products" element={<ArtistProducts />} />
            <Route path="/artist/orders" element={<ArtistOrders />} />
            <Route path="/artist/analytics" element={<ArtistAnalytics />} />
            <Route path="/artist/profile" element={<ArtistProfile />} />
            <Route path="/artist/chats" element={<ArtistChats />} />
            <Route path="/admin" element={<AdminOverview />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/artists" element={<AdminArtists />} />
            <Route path="/admin/artists/review" element={<AdminArtistReview />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/audit" element={<AdminAuditLog />} />
            <Route path="/admin/chats" element={<AdminChats />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Chatbot />
          <BackButton />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
