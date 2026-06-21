import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star, MapPin, ArrowRight, ArrowLeft, Plus, Minus, Heart,
  CalendarDays, Users, ShieldCheck, BadgeCheck, Wallet, Headphones, Check,
} from "lucide-react";
import SearchBar from "../components/SearchBar";
import Button from "../components/ui/Button";
import { cn } from "../lib/cn";
import { DESTINATIONS, DEALS, FAQS, formatMoney } from "../lib/mockData";

const HERO_IMG =
  "https://images.unsplash.com/photo-1582610116397-edb318620f90?auto=format&fit=crop&w=1900&q=80";
const NEWS_IMG =
  "https://images.unsplash.com/photo-1602002418816-5c0aeef426aa?auto=format&fit=crop&w=1900&q=80";
const AVATARS = [11, 32, 45, 14].map((n) => `https://i.pravatar.cc/64?img=${n}`);

const HERO_CHIPS = [
  { icon: Wallet, label: "Zero commission" },
  { icon: BadgeCheck, label: "Verified hosts" },
  { icon: ShieldCheck, label: "Secure deposit" },
  { icon: MapPin, label: "Pay balance at property" },
];

export default function Home() {
  return (
    <div>
      <Hero />
      <Destinations />
      <Deals />
      <Faq />
      <Newsletter />
    </div>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative bg-zinc-900 text-white">
      <div className="absolute inset-0">
        <img src={HERO_IMG} alt="Luxury resort stay" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/70" />
      </div>
      <div className="container-px relative z-10 flex min-h-[88svh] flex-col items-center justify-center py-20 text-center text-white sm:min-h-screen sm:py-24">
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="font-display text-[2rem] font-extrabold leading-tight tracking-tight sm:text-5xl"
        >
          Find your perfect <span className="text-brand-500">stay</span>
        </motion.h1>
        <p className="mt-3 max-w-xl text-sm text-white/85 sm:mt-4 sm:text-base">
          Book unique homes directly with the people who host them — zero booking fees,
          a small deposit now, and the balance paid at the property.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
          className="mt-6 w-full max-w-4xl sm:mt-9"
        >
          <SearchBar />
        </motion.div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:mt-6 sm:gap-2.5">
          {HERO_CHIPS.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium backdrop-blur sm:px-3 sm:py-1.5 sm:text-xs">
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Section header ---------------- */
function Pill({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {children}
    </span>
  );
}

/* Horizontal scroll row with arrows */
function useScrollRow() {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.9), behavior: "smooth" });
  return { ref, scroll };
}

/* ---------------- Destinations ---------------- */
function Destinations() {
  const { ref, scroll } = useScrollRow();
  return (
    <section className="container-px py-14 sm:py-20">
      <Pill>Guest favorites</Pill>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Explore Unique Stays</h2>
        <p className="text-sm text-muted">Handpicked homes you can book directly with the host.</p>
      </div>

      <div ref={ref} className="mt-8 flex snap-x gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {DESTINATIONS.map((d, i) => (
          <DestinationCard key={d.id} d={d} index={i} />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-2">
          <ArrowBtn dir="left" onClick={() => scroll(-1)} />
          <ArrowBtn dir="right" onClick={() => scroll(1)} />
        </div>
        <Button as={Link} to="/listings" className="rounded-full">Explore More <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </section>
  );
}

function DestinationCard({ d, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }}
      className="group relative w-[260px] shrink-0 snap-start sm:w-[270px]"
    >
      <Link to="/listings" className="block overflow-hidden rounded-3xl">
        <div className="relative aspect-[4/5]">
          <img src={d.image} alt={d.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
          <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">{d.nights}</span>
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-zinc-900">
            <Star className="h-3 w-3 fill-brand-500 text-brand-500" /> {d.rating}
          </span>
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <h3 className="font-semibold leading-snug">{d.title}</h3>
            <p className="mt-0.5 font-display text-lg font-bold">{formatMoney(d.price)}<span className="text-xs font-normal text-white/80"> /night</span></p>
            <p className="mt-1 line-clamp-2 text-xs text-white/80">{d.desc}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ---------------- Weekend Deals ---------------- */
function Deals() {
  const { ref, scroll } = useScrollRow();
  return (
    <section className="bg-muted-light py-14 dark:bg-muted-dark sm:py-20">
      <div className="container-px">
        <Pill>Featured</Pill>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Featured Stays</h2>
            <p className="mt-1 text-sm text-muted">Book directly with hosts — pay a small deposit now, the balance at the property.</p>
          </div>
          <div className="flex items-center gap-3">
            <ArrowBtn dir="left" onClick={() => scroll(-1)} />
            <ArrowBtn dir="right" onClick={() => scroll(1)} />
            <Link to="/listings" className="text-sm font-semibold text-brand-600 hover:underline">View all deals →</Link>
          </div>
        </div>

        <div ref={ref} className="mt-8 flex snap-x gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DEALS.map((d, i) => <DealCard key={d.id} d={d} index={i} />)}
        </div>
      </div>
    </section>
  );
}

function DealCard({ d, index }) {
  const [liked, setLiked] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }}
      className="card-surface w-[260px] shrink-0 snap-start overflow-hidden rounded-3xl shadow-card sm:w-[270px]"
    >
      <div className="relative aspect-[4/3]">
        <img src={d.image} alt={d.title} loading="lazy" className="h-full w-full object-cover" />
        <button onClick={() => setLiked((v) => !v)} aria-label="Save"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-zinc-700 backdrop-blur">
          <Heart className={liked ? "h-4 w-4 fill-brand-500 text-brand-500" : "h-4 w-4"} />
        </button>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-zinc-900 backdrop-blur">
          <Star className="h-3 w-3 fill-brand-500 text-brand-500" /> {d.rating}
        </span>
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          <span className="rounded-full bg-brand-500 px-2 py-1 text-[10px] font-semibold text-white">{d.tag}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
            <CalendarDays className="h-3 w-3" /> {d.date}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {d.nights} nights</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {d.guests} guests</span>
        </div>
        <h3 className="mt-1 font-semibold leading-snug">{d.title}</h3>
        <p className="inline-flex items-center gap-1 text-sm text-muted"><MapPin className="h-3.5 w-3.5" /> {d.place}</p>
        <div className="mt-3 flex items-end justify-between">
          <p className="text-sm">
            <span className="block text-[11px] text-muted">From</span>
            <span className="font-display text-lg font-bold">{formatMoney(d.price)}</span>
            <span className="text-xs text-muted"> /night</span>
          </p>
          <Button as={Link} to="/listings" size="sm" className="rounded-full">Book Now <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- FAQ ---------------- */
function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="container-px py-14 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="flex justify-center"><Pill>Frequently Asked Questions</Pill></div>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Got questions?<br /><span className="text-brand-500">We've got answers</span>
        </h2>
        <p className="mt-3 text-sm text-muted">Everything you need to know about booking your perfect stay.</p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className={cn(
              "overflow-hidden rounded-2xl border transition-colors",
              isOpen ? "border-brand-200 dark:border-brand-500/30" : "border-hair-light dark:border-hair-dark"
            )}>
              <button onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}
                className={cn("flex w-full items-center justify-between gap-4 px-5 py-4 text-left", isOpen && "bg-brand-50/60 dark:bg-brand-500/10")}>
                <span className={cn("font-semibold", isOpen && "text-brand-700 dark:text-brand-300")}>{f.q}</span>
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", isOpen ? "bg-brand-500 text-white" : "bg-muted-light text-zinc-500 dark:bg-muted-dark")}>
                  {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
              </button>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  className="px-5 pb-5 text-sm text-muted">
                  {f.points ? (
                    <ul className="space-y-2">
                      {f.points.map((p, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" /> {p}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{f.a}</p>
                  )}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- Newsletter ---------------- */
function Newsletter() {
  return (
    <section className="relative w-full overflow-hidden">
      <img src={NEWS_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-700/90 to-brand-500/80" />
      <div className="container-px relative py-16 text-center text-white sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">Newsletter</span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            New Stays, Direct Deals<br />Straight to Your Inbox
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/85">
            Be the first to know when hosts add new stays and commission-free offers — booked directly, every time.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="mx-auto mt-6 flex w-full max-w-md flex-col gap-2 sm:flex-row">
            <input type="email" required placeholder="Enter your email address"
              className="h-12 flex-1 rounded-xl border-0 bg-white/95 px-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-400" />
            <Button type="submit" variant="dark" className="h-12 rounded-xl">Subscribe</Button>
          </form>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/85">
            <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Weekly travel deals</span>
            <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Exclusive discounts</span>
            <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> No spam, unsubscribe anytime</span>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {AVATARS.map((src, i) => <img key={i} src={src} alt="" className="h-8 w-8 rounded-full border-2 border-white object-cover" />)}
            </div>
            <p className="text-sm"><span className="font-bold">50,000+</span> <span className="text-white/85">Happy subscribers</span></p>
          </div>
        </div>
    </section>
  );
}

/* ---------------- shared ---------------- */
function ArrowBtn({ dir, onClick }) {
  const Icon = dir === "left" ? ArrowLeft : ArrowRight;
  return (
    <button onClick={onClick} aria-label={dir === "left" ? "Previous" : "Next"}
      className="grid h-10 w-10 place-items-center rounded-full bg-brand-500 text-white transition-colors hover:bg-brand-600">
      <Icon className="h-4 w-4" />
    </button>
  );
}
