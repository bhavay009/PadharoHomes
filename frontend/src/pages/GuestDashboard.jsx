import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Luggage, MapPin, ArrowRight, Plus, Star, Check } from "lucide-react";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { getTrips } from "../api";
import { useAuth } from "../auth/AuthProvider";

const STATUS_TONE = {
  confirmed: "info", checked_in: "warning", completed: "success",
  pending: "neutral", cancelled: "neutral", no_show: "neutral", expired: "neutral",
};
const money = (n, c = "₹") => `${c}${Number(n).toLocaleString("en-IN")}`;

export default function GuestDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    getTrips()
      .then((res) => setTrips(res.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-px py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My trips</h1>
          <p className="mt-1 text-sm text-muted">Bookings you've made with {user?.email}.</p>
        </div>
        <Button as={Link} to="/listings" variant="secondary">Browse stays <ArrowRight className="h-4 w-4" /></Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div>
        ) : trips.length === 0 ? (
          <EmptyState icon={Luggage} title="No trips yet"
            description="When you book a stay, your trips will show up here."
            action={<Button as={Link} to="/listings">Find a stay</Button>} />
        ) : (
          <div className="space-y-3">
            {trips.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="card-surface flex flex-wrap items-center justify-between gap-3 rounded-3xl p-5 shadow-card">
                <div className="min-w-0">
                  <p className="font-semibold">{t.check_in} → {t.check_out}</p>
                  <p className="text-sm text-muted">{t.nights} night(s) · ref {t.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className="font-semibold">{money(t.subtotal)}</p>
                    <p className="text-xs text-muted">Deposit {money(t.deposit_amount)} · Balance {money(t.balance_amount)}</p>
                  </div>
                  <Badge tone={STATUS_TONE[t.status] || "neutral"}>{t.status.replace("_", " ")}</Badge>
                  {t.reviewed ? (
                    <span className="inline-flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Reviewed</span>
                  ) : ["confirmed", "checked_in", "completed"].includes(t.status) ? (
                    <Link to={`/property/${t.unit_id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                      <Star className="h-4 w-4" /> Review
                    </Link>
                  ) : (
                    <Link to={`/property/${t.unit_id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                      <MapPin className="h-4 w-4" /> View
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Become a host nudge */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-muted-light p-6">
        <div>
          <h2 className="font-semibold">Have a place to share?</h2>
          <p className="text-sm text-muted">List it and take direct bookings — zero commission.</p>
        </div>
        <Button as={Link} to="/host"><Plus className="h-4 w-4" /> Become a host</Button>
      </div>
    </div>
  );
}
