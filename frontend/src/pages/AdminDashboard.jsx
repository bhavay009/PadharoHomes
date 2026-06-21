import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, Building2, CalendarDays, Star, Wallet, Layers,
  ShieldAlert, Trash2, EyeOff, Eye,
} from "lucide-react";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import { useAuth } from "../auth/AuthProvider";
import {
  adminStats, adminHosts, adminUnits, adminBookings, adminReviews,
  adminSetUnitStatus, adminDeleteReview,
} from "../api";
import { cn } from "../lib/cn";

const money = (n, c = "₹") => `${c}${Number(n).toLocaleString("en-IN")}`;
const TABS = ["Overview", "Hosts", "Listings", "Bookings", "Reviews"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState("Overview");

  // Guard: admins only.
  if (user && !user.is_admin) return <Navigate to="/" replace />;

  return (
    <div className="container-px py-8">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-6 w-6 text-brand-500" />
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Platform oversight & moderation.</p>

      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-full border border-hair-light bg-muted-light p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              tab === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900")}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Overview" && <Overview />}
        {tab === "Hosts" && <Hosts />}
        {tab === "Listings" && <Listings />}
        {tab === "Bookings" && <Bookings />}
        {tab === "Reviews" && <Reviews />}
      </div>
    </div>
  );
}

function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reload = () => { setError(null); fn().then(setData).catch((e) => setError(e.message)); };
  useEffect(reload, deps); // eslint-disable-line
  return { data, error, reload, setData };
}

function Overview() {
  const { data, error } = useFetch(adminStats);
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}</div>;
  const cards = [
    { icon: Users, label: "Hosts", value: data.total_hosts, tone: "text-sky-600" },
    { icon: Building2, label: "Listings", value: data.total_units, tone: "text-brand-600" },
    { icon: CalendarDays, label: "Bookings", value: data.total_bookings, tone: "text-violet-600" },
    { icon: Star, label: "Reviews", value: data.total_reviews, tone: "text-amber-600" },
    { icon: Wallet, label: "Gross booking value", value: money(data.gross_booking_value), tone: "text-emerald-600" },
    { icon: Layers, label: "Deposits collected", value: money(data.deposits_collected), tone: "text-teal-600" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="card-surface rounded-3xl p-5 shadow-card">
            <c.icon className={`h-5 w-5 ${c.tone}`} />
            <p className="mt-3 text-2xl font-bold tracking-tight">{c.value}</p>
            <p className="text-xs text-muted">{c.label}</p>
          </motion.div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Breakdown title="Listings by status" data={data.units_by_status} />
        <Breakdown title="Bookings by status" data={data.bookings_by_status} />
      </div>
    </div>
  );
}

function Breakdown({ title, data }) {
  const rows = Object.entries(data).filter(([, v]) => v > 0);
  return (
    <div className="card-surface rounded-3xl p-5 shadow-card">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted">No data yet.</p> : rows.map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="capitalize text-muted">{k.replace("_", " ")}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableShell({ error, data, head, children }) {
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>;
  if (data.items.length === 0) return <p className="text-sm text-muted">Nothing here yet.</p>;
  return (
    <div className="card-surface overflow-x-auto rounded-3xl shadow-card">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-hair-light text-left text-xs uppercase tracking-wide text-muted">{head}</tr></thead>
        <tbody className="divide-y divide-hair-light">{children}</tbody>
      </table>
    </div>
  );
}

function Hosts() {
  const { data, error } = useFetch(adminHosts);
  return (
    <TableShell data={data} error={error}
      head={<>{["Host", "Joined", "Listings", "Bookings"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</>}>
      {data?.items.map((h) => (
        <tr key={h.id}>
          <td className="px-4 py-3"><p className="font-medium">{h.full_name || "—"}</p><p className="text-xs text-muted">{h.email}</p></td>
          <td className="px-4 py-3 text-muted">{new Date(h.created_at).toLocaleDateString()}</td>
          <td className="px-4 py-3">{h.unit_count}</td>
          <td className="px-4 py-3">{h.booking_count}</td>
        </tr>
      ))}
    </TableShell>
  );
}

function Listings() {
  const { data, error, setData } = useFetch(adminUnits);
  const moderate = async (id, status) => {
    await adminSetUnitStatus(id, status);
    setData((d) => ({ ...d, items: d.items.map((u) => (u.id === id ? { ...u, status } : u)) }));
  };
  return (
    <TableShell data={data} error={error}
      head={<>{["Listing", "Host", "Price", "Status", "Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</>}>
      {data?.items.map((u) => (
        <tr key={u.id}>
          <td className="px-4 py-3"><p className="font-medium">{u.title}</p><p className="text-xs text-muted">{u.city}</p></td>
          <td className="px-4 py-3 text-muted">{u.host_email}</td>
          <td className="px-4 py-3">{money(u.base_price)}</td>
          <td className="px-4 py-3"><Badge tone={u.status === "published" ? "success" : u.status === "unlisted" ? "warning" : "neutral"}>{u.status}</Badge></td>
          <td className="px-4 py-3">
            {u.status === "published" ? (
              <button onClick={() => moderate(u.id, "unlisted")} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline"><EyeOff className="h-3.5 w-3.5" /> Unlist</button>
            ) : (
              <button onClick={() => moderate(u.id, "published")} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"><Eye className="h-3.5 w-3.5" /> Publish</button>
            )}
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

function Bookings() {
  const { data, error } = useFetch(adminBookings);
  return (
    <TableShell data={data} error={error}
      head={<>{["Guest", "Listing", "Dates", "Amount", "Status"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</>}>
      {data?.items.map((b) => (
        <tr key={b.id}>
          <td className="px-4 py-3"><p className="font-medium">{b.guest_name}</p><p className="text-xs text-muted">{b.guest_email}</p></td>
          <td className="px-4 py-3 text-muted">{b.unit_title}</td>
          <td className="px-4 py-3 text-muted">{b.check_in} → {b.check_out}</td>
          <td className="px-4 py-3">{money(b.subtotal)}</td>
          <td className="px-4 py-3"><Badge tone="neutral">{b.status.replace("_", " ")}</Badge></td>
        </tr>
      ))}
    </TableShell>
  );
}

function Reviews() {
  const { data, error, setData } = useFetch(adminReviews);
  const remove = async (id) => {
    if (!confirm("Delete this review?")) return;
    await adminDeleteReview(id);
    setData((d) => ({ ...d, items: d.items.filter((r) => r.id !== id), total: d.total - 1 }));
  };
  return (
    <TableShell data={data} error={error}
      head={<>{["Guest", "Listing", "Rating", "Comment", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</>}>
      {data?.items.map((r) => (
        <tr key={r.id}>
          <td className="px-4 py-3 font-medium">{r.guest_name}</td>
          <td className="px-4 py-3 text-muted">{r.unit_title}</td>
          <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" /> {r.rating}</span></td>
          <td className="px-4 py-3 max-w-xs truncate text-muted">{r.comment || "—"}</td>
          <td className="px-4 py-3"><button onClick={() => remove(r.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Delete</button></td>
        </tr>
      ))}
    </TableShell>
  );
}
