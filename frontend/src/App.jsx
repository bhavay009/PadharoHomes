import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Listings from "./pages/Listings";
import PropertyDetails from "./pages/PropertyDetails";
import HostDashboard from "./pages/HostDashboard";
import GuestDashboard from "./pages/GuestDashboard";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import CreateProperty from "./pages/CreateProperty";
import BookingConfirmation from "./pages/BookingConfirmation";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import { Terms, Privacy } from "./pages/Legal";
import RequireAuth from "./components/RequireAuth";
import { cn } from "./lib/cn";

function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  // Scroll to top on route change.
  useEffect(() => window.scrollTo(0, 0), [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-bg-light text-zinc-900">
      <Navbar />
      {/* Fixed navbar overlays the home hero; other pages need its height as offset. */}
      <main className={cn("flex-1", !isHome && "pt-[72px]")}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Page><Home /></Page>} />
            <Route path="/listings" element={<Page><Listings /></Page>} />
            <Route path="/property/:id" element={<Page><PropertyDetails /></Page>} />
            <Route path="/account" element={<RequireAuth><Page><GuestDashboard /></Page></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Page><Profile /></Page></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth><Page><AdminDashboard /></Page></RequireAuth>} />
            <Route path="/host" element={<RequireAuth><Page><HostDashboard /></Page></RequireAuth>} />
            <Route path="/host/new" element={<RequireAuth><Page><CreateProperty /></Page></RequireAuth>} />
            <Route path="/booking/confirmation" element={<Page><BookingConfirmation /></Page>} />
            <Route path="/terms" element={<Page><Terms /></Page>} />
            <Route path="/privacy" element={<Page><Privacy /></Page>} />
            <Route path="/login" element={<Page><Login /></Page>} />
            <Route path="/signup" element={<Page><Signup /></Page>} />
            <Route path="*" element={<Page><NotFound /></Page>} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
