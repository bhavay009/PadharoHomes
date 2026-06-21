import { Link, useLocation, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, CalendarDays, MapPin, Mail, ArrowRight } from "lucide-react";
import Button from "../components/ui/Button";

const money = (n, c = "₹") => `${c}${Number(n).toLocaleString("en-IN")}`;

export default function BookingConfirmation() {
  const { state } = useLocation();
  const booking = state?.booking;
  const unit = state?.unit;

  // Reached without completing a booking — send to listings.
  if (!booking) return <Navigate to="/listings" replace />;

  const ref = booking.id.slice(0, 8).toUpperCase();

  return (
    <div className="container-px py-12">
      <div className="mx-auto max-w-lg text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15"
        >
          <CheckCircle2 className="h-11 w-11" />
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mt-6 text-3xl font-bold tracking-tight">
          Booking confirmed!
        </motion.h1>
        <p className="mt-2 text-muted">
          Your stay is locked in. We've emailed the details to you.
        </p>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="card-surface mt-8 overflow-hidden rounded-3xl text-left shadow-soft">
          {unit?.images?.[0] && <img src={unit.images[0]} alt="" className="h-44 w-full object-cover" />}
          <div className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{unit?.title || "Your stay"}</h2>
                {unit && (
                  <p className="inline-flex items-center gap-1 text-sm text-muted">
                    <MapPin className="h-4 w-4" /> {unit.city}, {unit.country}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-muted-light px-3 py-1 text-xs font-semibold">{ref}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info icon={CalendarDays} label="Dates" value={`${booking.check_in} → ${booking.check_out}`} />
              <Info icon={Mail} label="Status" value={booking.status} />
            </div>

            <div className="space-y-1.5 border-t border-hair-light pt-4 text-sm">
              <div className="flex justify-between"><span className="text-muted">Nights</span><span>{booking.nights}</span></div>
              <div className="flex justify-between"><span className="text-muted">Total</span><span>{money(booking.subtotal, booking.currency === "INR" ? "₹" : booking.currency + " ")}</span></div>
              <div className="flex justify-between"><span className="text-muted">Deposit paid</span><span className="font-semibold">{money(booking.deposit_amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Pay at property</span><span>{money(booking.balance_amount)}</span></div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button as={Link} to="/listings" variant="secondary">Browse more stays</Button>
          <Button as={Link} to="/">Back home <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-muted-light p-3 dark:bg-muted-dark">
      <Icon className="h-4 w-4 text-brand-500" />
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
