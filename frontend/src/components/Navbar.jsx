import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Heart, Menu, X, LayoutDashboard, PlusCircle, LogOut, Luggage, UserCircle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./ui/Button";
import Logo from "./Logo";
import { useAuth } from "../auth/AuthProvider";
import { cn } from "../lib/cn";

// Header reflects the PRD's two roles only: Guest (browse) and Host (manage).
const LINKS = [
  { to: "/listings", label: "Explore Stays" },
  { to: "/host", label: "Become a Host" },
];

function MenuItem({ to, icon: Icon, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} role="menuitem"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted-light">
      <Icon className="h-4 w-4 text-brand-500" /> {children}
    </Link>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signOut = () => {
    logout();
    setMenuOpen(false);
    setOpen(false);
    navigate("/");
  };

  // On the home page, stay transparent over the full-screen hero and only turn
  // white once we've scrolled past it — so no white bar flashes over the photo.
  const isHome = pathname === "/";
  const heroHeight = typeof window !== "undefined" ? window.innerHeight - 90 : 700;
  const overlay = isHome && scrollY < heroHeight;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        overlay
          ? "bg-transparent"
          : "border-b border-hair-light bg-white/90 shadow-sm backdrop-blur-xl"
      )}
    >
      <nav className="container-px flex h-[72px] items-center justify-between gap-4">
        {/* Logo */}
        <Logo light={overlay} />

        {/* Center links */}
        <div className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l, i) => (
            <NavLink key={l.label + i} to={l.to}
              className={cn(
                "text-sm font-medium transition-colors hover:text-brand-500",
                overlay ? "text-white/90" : "text-zinc-600"
              )}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/listings" aria-label="Wishlist"
            className={cn(
              "hidden h-10 w-10 items-center justify-center rounded-full transition-colors sm:flex",
              overlay ? "text-white hover:bg-white/15" : "text-zinc-600 hover:bg-muted-light"
            )}>
            <Heart className="h-5 w-5" />
          </Link>

          {isAuthenticated ? (
            <div className="relative hidden lg:block">
              <button onClick={() => setMenuOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-2 rounded-full border py-1 pl-3 pr-1 transition-colors",
                  overlay ? "border-white/30 hover:bg-white/15" : "border-hair-light hover:bg-muted-light"
                )}
                aria-haspopup="menu" aria-expanded={menuOpen}>
                <Menu className={cn("h-4 w-4", overlay ? "text-white" : "text-zinc-500")} />
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-sm font-bold uppercase text-white">
                  {(user.name || user.email || user.phone || "U")[0]}
                </span>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-hair-light bg-white p-1.5 shadow-soft-lg" role="menu">
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email || user.phone}</p>
                    </div>
                    <div className="my-1 h-px bg-hair-light" />
                    {user.role === "host" ? (
                      <>
                        <MenuItem to="/host" icon={LayoutDashboard} onClick={() => setMenuOpen(false)}>Host dashboard</MenuItem>
                        <MenuItem to="/host/new" icon={PlusCircle} onClick={() => setMenuOpen(false)}>Add listing</MenuItem>
                      </>
                    ) : (
                      <>
                        <MenuItem to="/account" icon={Luggage} onClick={() => setMenuOpen(false)}>My trips</MenuItem>
                        <MenuItem to="/host" icon={PlusCircle} onClick={() => setMenuOpen(false)}>Become a host</MenuItem>
                      </>
                    )}
                    <MenuItem to="/profile" icon={UserCircle} onClick={() => setMenuOpen(false)}>Profile</MenuItem>
                    {user.is_admin && <MenuItem to="/admin" icon={ShieldAlert} onClick={() => setMenuOpen(false)}>Admin</MenuItem>}
                    <div className="my-1 h-px bg-hair-light" />
                    <button onClick={signOut} role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-muted-light">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button as={Link} to="/login" size="sm" className="hidden rounded-full lg:inline-flex">
              Login / Signup
            </Button>
          )}

          <button onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border lg:hidden",
              overlay ? "border-white/30 text-white" : "border-hair-light text-zinc-700"
            )} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-hair-light bg-white lg:hidden">
            <div className="container-px flex flex-col gap-1 py-3">
              {LINKS.map((l, i) => (
                <NavLink key={l.label + i} to={l.to} onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-muted-light">
                  {l.label}
                </NavLink>
              ))}

              {isAuthenticated ? (
                <>
                  <div className="my-2 h-px bg-hair-light" />
                  <p className="truncate px-4 pb-1 text-xs text-muted">{user.email || user.phone}</p>
                  {user.role === "host" ? (
                    <>
                      <MenuItem to="/host" icon={LayoutDashboard} onClick={() => setOpen(false)}>Host dashboard</MenuItem>
                      <MenuItem to="/host/new" icon={PlusCircle} onClick={() => setOpen(false)}>Add listing</MenuItem>
                    </>
                  ) : (
                    <>
                      <MenuItem to="/account" icon={Luggage} onClick={() => setOpen(false)}>My trips</MenuItem>
                      <MenuItem to="/host" icon={PlusCircle} onClick={() => setOpen(false)}>Become a host</MenuItem>
                    </>
                  )}
                  <MenuItem to="/profile" icon={UserCircle} onClick={() => setOpen(false)}>Profile</MenuItem>
                  {user.is_admin && <MenuItem to="/admin" icon={ShieldAlert} onClick={() => setOpen(false)}>Admin</MenuItem>}
                  <Button variant="secondary" className="mt-2 rounded-full" onClick={signOut}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </>
              ) : (
                <div className="mt-2 flex gap-2 border-t border-hair-light pt-3">
                  <Button as={Link} to="/login" variant="secondary" className="flex-1 rounded-full" onClick={() => setOpen(false)}>Login</Button>
                  <Button as={Link} to="/signup" className="flex-1 rounded-full" onClick={() => setOpen(false)}>Signup</Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
