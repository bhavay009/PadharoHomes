import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, Wallet, Clock, PiggyBank, Percent, Plus,
  Home as HomeIcon, CalendarCheck, LayoutGrid, CalendarDays,
} from "lucide-react";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { listUnits, listHostBookings, getMetrics } from "../api";
import { cn } from "../lib/cn";

const STATUS_TONE = {
  confirmed: "info", checked_in: "warning", completed: "success",
  pending: "neutral", cancelled: "neutral", no_show: "neutral", expired: "neutral",
};
const UNIT_TONE = { published: "success", draft: "neutral", unlisted: "warning" };
const money = (n, c = "₹") => `${c}${Number(n).toLocaleString("en-IN")}`;

export default function HostDashboard() {
  const { state } = useLocation();
  // Signup lands on "listings" (add homes); login lands on "bookings".
  const [tab, setTab] = useState(state?.tab === "bookings" ? "bookings" : "listings");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [units, setUnits] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [m, u, b] = await Promise.all([
          getMetrics(),
          listUnits({ limit: 50 }),
          listHostBookings({ limit: 20 }),
        ]);
        setMetrics(m);
        setUnits(u.items);
        setBookings(b.items);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const c = metrics?.currency || "₹";
  const cards = metrics ? [
    { icon: TrendingUp, label: "Revenue booked", value: money(metrics.revenue_booked, c), tone: "text-emerald-600" },
    { icon: Wallet, label: "Cash collected", value: money(metrics.cash_collected, c), tone: "text-sky-600" },
    { icon: Clock, label: "Outstanding", value: money(metrics.outstanding_balance, c), tone: "text-amber-600" },
    { icon: PiggyBank, label: "Commission saved", value: money(metrics.commission_saved, c), tone: "text-brand-600" },
    { icon: Percent, label: `Occupancy (${metrics.occupancy_window_days}d)`, value: `${metrics.occupancy_percent}%`, tone: "text-violet-600" },
  ] : [];

  return (
    <div className="container-px py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Host dashboard</h1>
          <p className="mt-1 text-sm text-muted">Manage your listings and the bookings on them.</p>
        </div>
        <Button as={Link} to="/host/new"><Plus className="h-4 w-4" /> New listing</Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {/* Metrics */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)
          : cards.map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="card-surface rounded-3xl p-5 shadow-card">
                <card.icon className={`h-5 w-5 ${card.tone}`} />
                <p className="mt-3 text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="text-xs text-muted">{card.label}</p>
              </motion.div>
            ))}
      </div>

      {/* Tabs */}
      <div className="mt-8 inline-flex rounded-full border border-hair-light bg-muted-light p-1">
        <Tab active={tab === "listings"} onClick={() => setTab("listings")} icon={LayoutGrid}>
          My Listings {!loading && `(${units.length})`}
        </Tab>
        <Tab active={tab === "bookings"} onClick={() => setTab("bookings")} icon={CalendarDays}>
          Bookings {!loading && `(${bookings.length})`}
        </Tab>
      </div>

      <div className="mt-6">
        {tab === "listings"
          ? <ListingsView loading={loading} units={units} />
          : <BookingsView loading={loading} bookings={bookings} />}
      </div>
    </div>
  );
}

function Tab({ active, onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
        active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
      )}>
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

function ListingsView({ loading, units }) {
  if (loading) {
    return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}</div>;
  }
  if (units.length === 0) {
    return <EmptyState icon={HomeIcon} title="No listings yet"
      description="Publish your first property to start taking direct bookings."
      action={<Button as={Link} to="/host/new"><Plus className="h-4 w-4" /> Create listing</Button>} />;
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {units.map((p) => (
        <Link key={p.id} to={`/property/${p.id}`} className="card-surface group block overflow-hidden rounded-3xl shadow-card">
          {p.photos?.[0]
            ? <img src={p.photos[0].url} alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <div className="grid aspect-[4/3] w-full place-items-center bg-muted-light text-zinc-400"><HomeIcon className="h-8 w-8" /></div>}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-semibold">{p.title}</h3>
              <Badge tone={UNIT_TONE[p.status] || "neutral"}>{p.status}</Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted">{p.city}</p>
            <p className="mt-1 text-sm"><span className="font-semibold">{money(p.base_price)}</span><span className="text-muted"> /night</span></p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function BookingsView({ loading, bookings }) {
  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>;
  }
  if (bookings.length === 0) {
    return <EmptyState icon={CalendarCheck} title="No bookings yet"
      description="When guests book your listings, their reservations will appear here." />;
  }
  return (
    <div className="card-surface divide-y divide-hair-light overflow-hidden rounded-3xl shadow-card">
      {bookings.map((b) => (
        <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{b.guest_name}</p>
            <p className="truncate text-xs text-muted">{b.guest_email}</p>
          </div>
          <p className="text-sm text-muted">{b.check_in} → {b.check_out} · {b.nights} night(s)</p>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-semibold">{money(b.subtotal)}</span>
            <Badge tone={STATUS_TONE[b.status] || "neutral"}>{b.status.replace("_", " ")}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
