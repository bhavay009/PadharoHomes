import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star, MapPin, Users, BedDouble, Bath, ChevronLeft, ShieldCheck,
  Wifi, Waves, Snowflake, UtensilsCrossed, Car, WashingMachine, Tv,
  PawPrint, Briefcase, Droplets, Loader2, MessageSquare,
} from "lucide-react";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import {
  getPublicUnit, getPublicQuote, createBooking, payBooking,
  getUnitReviews, createReview, getTrips, getUnitHost,
} from "../api";
import { adaptUnit } from "../lib/adapt";
import { useAuth } from "../auth/AuthProvider";

const AMENITY_ICON = {
  wifi: Wifi, pool: Waves, "air conditioning": Snowflake, ac: Snowflake,
  kitchen: UtensilsCrossed, "free parking": Car, parking: Car, washer: WashingMachine,
  tv: Tv, "pet friendly": PawPrint, workspace: Briefcase, "hot tub": Droplets,
};
const money = (n, c = "₹") => `${c}${Number(n).toLocaleString("en-IN")}`;

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getPublicUnit(id)
      .then((u) => setUnit(adaptUnit(u)))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <DetailsSkeleton />;
  if (notFound || !unit) {
    return (
      <div className="container-px py-16">
        <EmptyState icon={MapPin} title="Listing not found"
          description="This stay may have been removed or isn't published."
          action={<Button as={Link} to="/listings">Browse stays</Button>} />
      </div>
    );
  }

  return (
    <div className="container-px py-6">
      <Link to="/listings" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-brand-500">
        <ChevronLeft className="h-4 w-4" /> Back to stays
      </Link>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{unit.title}</h1>
      <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
        <MapPin className="h-4 w-4" /> {unit.city}{unit.state ? `, ${unit.state}` : ""}, {unit.country}
      </p>

      {/* Gallery */}
      <div className="mt-5 grid grid-cols-4 gap-2 overflow-hidden rounded-3xl">
        <motion.img initial={{ scale: 1.03, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
          src={unit.images[0]} alt="" className="col-span-4 aspect-[16/9] w-full object-cover sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:h-full" />
        {unit.images.slice(1, 3).map((src, i) => (
          <img key={i} src={src} alt="" className="col-span-2 hidden aspect-[4/3] w-full object-cover sm:block" />
        ))}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-hair-light pb-6">
            <Spec icon={Users} label={`${unit.capacity} guests`} />
            {unit.bedrooms != null && <Spec icon={BedDouble} label={`${unit.bedrooms} bedrooms`} />}
            {unit.baths != null && <Spec icon={Bath} label={`${unit.baths} baths`} />}
          </div>
          {unit.description && (
            <div className="border-b border-hair-light py-6">
              <p className="leading-relaxed text-zinc-700">{unit.description}</p>
            </div>
          )}
          {unit.amenities.length > 0 && (
            <div className="border-b border-hair-light py-6">
              <h2 className="text-xl font-bold tracking-tight">What this place offers</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {unit.amenities.map((a) => {
                  const Icon = AMENITY_ICON[a.toLowerCase()] || ShieldCheck;
                  return <div key={a} className="flex items-center gap-3 text-sm capitalize"><Icon className="h-5 w-5 text-brand-500" /> {a}</div>;
                })}
              </div>
            </div>
          )}
          <HostCard unitId={unit.id} />
          <Reviews unit={unit} />
        </div>

        <div className="lg:col-span-1">
          <BookingWidget unit={unit} onBooked={(booking) => navigate("/booking/confirmation", { state: { booking, unit } })} />
        </div>
      </div>
    </div>
  );
}

function Spec({ icon: Icon, label }) {
  return <span className="inline-flex items-center gap-2 text-sm font-medium"><Icon className="h-5 w-5 text-zinc-500" /> {label}</span>;
}

function BookingWidget({ unit, onBooked }) {
  const { user } = useAuth();
  // Pre-fill with the logged-in account so the booking lands in "My Trips".
  const [form, setForm] = useState({
    checkIn: "", checkOut: "", guests: 1,
    name: user?.name || "", email: user?.email || "",
  });
  const [quote, setQuote] = useState(null);
  const [quoteErr, setQuoteErr] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const datesReady = form.checkIn && form.checkOut;

  // Fetch a live quote from the backend when dates are set.
  useEffect(() => {
    if (!datesReady) { setQuote(null); setQuoteErr(null); return; }
    let active = true;
    getPublicQuote(unit.id, form.checkIn, form.checkOut)
      .then((q) => active && (setQuote(q), setQuoteErr(null)))
      .catch((e) => active && (setQuote(null), setQuoteErr(e.message)));
    return () => { active = false; };
  }, [unit.id, form.checkIn, form.checkOut, datesReady]);

  async function reserve(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await createBooking(unit.id, {
        guest_name: form.name,
        guest_email: form.email,
        guest_phone: null,
        check_in: form.checkIn,
        check_out: form.checkOut,
      });
      const confirmed = await payBooking(res.booking.id);
      onBooked(confirmed);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={reserve} className="card-surface sticky top-24 rounded-3xl p-6 shadow-soft">
      <p><span className="text-2xl font-bold">{money(unit.price, unit.currency === "INR" ? "₹" : unit.currency + " ")}</span> <span className="text-muted">/ night</span></p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-hair-light">
        <div className="grid grid-cols-2 divide-x divide-hair-light">
          <label className="p-3">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Check in</span>
            <input type="date" required value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className="mt-1 w-full bg-transparent text-sm outline-none" />
          </label>
          <label className="p-3">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Check out</span>
            <input type="date" required value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className="mt-1 w-full bg-transparent text-sm outline-none" />
          </label>
        </div>
        <label className="block border-t border-hair-light p-3">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Full name</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="mt-1 w-full bg-transparent text-sm outline-none" />
        </label>
        <label className="block border-t border-hair-light p-3">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Email</span>
          <input type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            readOnly={!!user?.email}
            className={`mt-1 w-full bg-transparent text-sm outline-none ${user?.email ? "text-zinc-500" : ""}`} />
        </label>
      </div>
      {user?.email && (
        <p className="mt-2 text-xs text-muted">Booked to your account — it'll appear in your trips.</p>
      )}

      {quoteErr && datesReady && <p className="mt-3 text-sm text-amber-600">{quoteErr}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <Button type="submit" size="lg" className="mt-4 w-full" disabled={busy || !quote}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Reserve & pay deposit"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted">Pay a deposit now, the balance at the property</p>

      {quote && (
        <div className="mt-5 space-y-2 border-t border-hair-light pt-4 text-sm">
          <Row label={`${money(quote.subtotal)} · ${quote.nights} night(s)`} value={money(quote.subtotal)} />
          <Row label={`Pay now (deposit ${quote.deposit_percent}%)`} value={money(quote.deposit_due)} strong />
          <Row label="Pay at property" value={money(quote.balance_due)} muted />
        </div>
      )}
    </form>
  );
}

function Row({ label, value, strong, muted }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted" : ""}`}>
      <span className={strong ? "font-semibold" : ""}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function HostCard({ unitId }) {
  const [host, setHost] = useState(null);
  useEffect(() => { getUnitHost(unitId).then(setHost).catch(() => setHost(null)); }, [unitId]);
  if (!host) return null;
  const since = new Date(host.member_since).getFullYear();
  return (
    <div className="border-b border-hair-light py-6">
      <div className="flex items-start gap-4">
        {host.avatar_url
          ? <img src={host.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          : <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-500 text-xl font-bold text-white">{(host.name || "H")[0]?.toUpperCase()}</div>}
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight">Hosted by {host.name}</h2>
          <p className="text-sm text-muted">Hosting since {since}{host.response_time ? ` · responds ${host.response_time}` : ""}</p>
          {host.languages?.length > 0 && (
            <p className="mt-1 text-sm text-muted">Speaks {host.languages.join(", ")}</p>
          )}
        </div>
      </div>
      {host.bio && <p className="mt-3 text-sm leading-relaxed text-zinc-700">{host.bio}</p>}
    </div>
  );
}

function Stars({ value, size = "h-4 w-4" }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= value ? "fill-brand-500 text-brand-500" : "text-zinc-300"}`} />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
          <Star className={`h-7 w-7 transition-transform hover:scale-110 ${n <= value ? "fill-brand-500 text-brand-500" : "text-zinc-300"}`} />
        </button>
      ))}
    </div>
  );
}

function Reviews({ unit }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [reviewable, setReviewable] = useState(null); // a booking the user can review
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = () => getUnitReviews(unit.id).then(setData).catch(() => setData({ items: [], average: null, count: 0 }));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [unit.id]);

  // Find a paid, not-yet-reviewed booking by this user on this unit.
  useEffect(() => {
    if (!user) { setReviewable(null); return; }
    getTrips()
      .then((res) => {
        const t = res.items.find(
          (b) => b.unit_id === unit.id && !b.reviewed &&
            ["confirmed", "checked_in", "completed"].includes(b.status)
        );
        setReviewable(t || null);
      })
      .catch(() => setReviewable(null));
  }, [unit.id, user]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createReview({ booking_id: reviewable.id, rating, comment: comment || null });
      setReviewable(null);
      setRating(0);
      setComment("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-6">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold tracking-tight">Reviews</h2>
        {data?.count > 0 && (
          <span className="inline-flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-current" /> <strong>{data.average}</strong>
            <span className="text-muted">· {data.count} review{data.count === 1 ? "" : "s"}</span>
          </span>
        )}
      </div>

      {/* Write a review (only if eligible) */}
      {reviewable && (
        <form onSubmit={submit} className="mt-4 rounded-2xl border border-hair-light p-4">
          <p className="text-sm font-semibold">Rate your stay</p>
          <div className="mt-2"><StarPicker value={rating} onChange={setRating} /></div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
            placeholder="Share details of your experience (optional)"
            className="mt-3 w-full rounded-xl border border-hair-light px-3 py-2 text-sm outline-none focus:border-brand-400" />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" size="sm" className="mt-3" disabled={busy || rating < 1}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit review"}
          </Button>
        </form>
      )}

      {/* List */}
      <div className="mt-5 space-y-5">
        {!data ? (
          <p className="text-sm text-muted">Loading reviews…</p>
        ) : data.items.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted">
            <MessageSquare className="h-5 w-5" /> No reviews yet — be the first after your stay.
          </div>
        ) : (
          data.items.map((r) => (
            <div key={r.id} className="border-b border-hair-light pb-5 last:border-0">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
                  {r.guest_name[0]?.toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold">{r.guest_name}</p>
                  <p className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-2"><Stars value={r.rating} /></div>
              {r.comment && <p className="mt-2 text-sm leading-relaxed text-zinc-700">{r.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="container-px py-6">
      <Skeleton className="h-7 w-2/3 rounded-lg" />
      <Skeleton className="mt-3 h-4 w-1/3 rounded-md" />
      <Skeleton className="mt-5 aspect-[16/9] w-full rounded-3xl sm:aspect-[3/1]" />
      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-5 w-1/2 rounded-md" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    </div>
  );
}
