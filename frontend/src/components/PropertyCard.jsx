import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Heart, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatMoney } from "../lib/mockData";
import { cn } from "../lib/cn";

export default function PropertyCard({ property, index = 0 }) {
  const [liked, setLiked] = useState(false);
  const [[page, dir], setPage] = useState([0, 0]);
  const count = property.images.length;
  const imgIdx = ((page % count) + count) % count;

  const paginate = useCallback((delta) => setPage(([p]) => [p + delta, delta]), []);
  const goTo = (i) => setPage([i, i > imgIdx ? 1 : -1]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.35) }}
      className="group relative"
    >
      {/* Image carousel */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative aspect-[20/19] overflow-hidden rounded-2xl bg-muted-light ring-1 ring-black/[0.06] transition-shadow duration-300 group-hover:shadow-soft dark:bg-muted-dark dark:ring-white/[0.06]"
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.img
            key={imgIdx}
            src={property.images[imgIdx]}
            alt={`${property.title} — photo ${imgIdx + 1} of ${count}`}
            loading="lazy"
            decoding="async"
            custom={dir}
            initial={{ opacity: 0, x: dir > 0 ? 28 : -28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir > 0 ? -28 : 28 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        </AnimatePresence>

        {/* Subtle top scrim for control legibility */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent opacity-80" />

        {/* Badge — single, restrained */}
        {(property.guestFavorite || property.superhost) && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold tracking-tight text-zinc-900 shadow-sm ring-1 ring-black/[0.04] backdrop-blur">
            {property.guestFavorite ? "Guest favorite" : "Superhost"}
          </span>
        )}

        {/* Wishlist */}
        <button
          type="button"
          onClick={() => setLiked((v) => !v)}
          aria-label={liked ? "Remove from wishlist" : "Save to wishlist"}
          aria-pressed={liked}
          className="absolute right-2.5 top-2.5 z-20 grid h-9 w-9 place-items-center rounded-full text-white transition-transform duration-200 hover:scale-105 focus-visible:scale-105"
        >
          <motion.span
            key={liked ? "on" : "off"}
            initial={{ scale: 0.7 }}
            animate={{ scale: [1.25, 1] }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <Heart
              className={cn(
                "h-[22px] w-[22px] transition-colors",
                liked
                  ? "fill-brand-500 text-brand-500"
                  : "fill-black/25 text-white [stroke-width:2.25]"
              )}
            />
          </motion.span>
        </button>

        {/* Arrows + dots */}
        {count > 1 && (
          <>
            <CarouselArrow side="left" disabledLook={false} onClick={() => paginate(-1)} />
            <CarouselArrow side="right" onClick={() => paginate(1)} />
            <div className="absolute inset-x-0 bottom-2.5 z-20 flex justify-center gap-1">
              {property.images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to photo ${i + 1}`}
                  aria-current={i === imgIdx}
                  onClick={() => goTo(i)}
                  className={cn(
                    "h-1.5 rounded-full bg-white/60 shadow-sm transition-all duration-300",
                    i === imgIdx ? "w-1.5 scale-110 bg-white" : "w-1.5 hover:bg-white/90"
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* Stretched link */}
        <Link
          to={`/property/${property.id}`}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={`${property.title} in ${property.city}, ${property.country} — ${formatMoney(property.price)} per night, rated ${property.rating} from ${property.reviews} reviews`}
        />
      </motion.div>

      {/* Metadata — refined hierarchy */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {property.city}, {property.country}
          </h3>
          {property.rating ? (
            <span className="flex shrink-0 items-center gap-1 text-sm text-zinc-900 dark:text-zinc-100">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="font-medium">{property.rating}</span>
              <span className="text-zinc-400 dark:text-zinc-500">({property.reviews})</span>
            </span>
          ) : (
            <span className="shrink-0 text-sm font-medium text-zinc-500">New</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[15px] leading-snug text-zinc-500 dark:text-zinc-400">
          {property.host?.name ? `Hosted by ${property.host.name}` : property.title}
        </p>
        {property.dates && (
          <p className="text-[15px] leading-snug text-zinc-500 dark:text-zinc-400">
            {property.dates}
          </p>
        )}
        <p className="mt-1.5 text-[15px] text-zinc-900 dark:text-zinc-100">
          <span className="font-semibold">{formatMoney(property.price)}</span>
          <span className="text-zinc-500 dark:text-zinc-400">&nbsp;night</span>
        </p>
      </div>
    </motion.article>
  );
}

function CarouselArrow({ side, onClick }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={cn(
        "absolute top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-zinc-700 opacity-0 shadow ring-1 ring-black/[0.06] backdrop-blur transition-all duration-200 hover:scale-105 hover:bg-white focus-visible:opacity-100 group-hover:opacity-100",
        side === "left" ? "left-2.5" : "right-2.5"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
