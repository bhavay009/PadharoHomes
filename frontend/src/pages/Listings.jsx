import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, MapPinned, X } from "lucide-react";
import SearchBar from "../components/SearchBar";
import PropertyCard from "../components/PropertyCard";
import PropertyCardSkeleton from "../components/PropertyCardSkeleton";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { browseUnits } from "../api";
import { adaptUnit } from "../lib/adapt";

const PRICE_MAX = 20000;

export default function Listings() {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [units, setUnits] = useState([]);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [showFilters, setShowFilters] = useState(false);

  const where = params.get("where") || "";
  const guests = Number(params.get("guests")) || 0;
  const checkIn = params.get("checkIn") || "";
  const checkOut = params.get("checkOut") || "";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (where) filters.city = where;
      if (guests) filters.guests = guests;
      if (maxPrice < PRICE_MAX) filters.max_price = maxPrice;
      // Only send dates as a valid pair.
      if (checkIn && checkOut) { filters.check_in = checkIn; filters.check_out = checkOut; }
      const res = await browseUnits(filters);
      setUnits(res.items.map(adaptUnit));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [where, guests, checkIn, checkOut, maxPrice]);

  useEffect(() => { load(); }, [load]);

  const activeFilters = [where && `"${where}"`, guests && `${guests}+ guests`, (checkIn && checkOut) && `${checkIn} → ${checkOut}`].filter(Boolean);

  return (
    <div className="container-px py-8">
      <div className="mx-auto max-w-3xl"><SearchBar /></div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {loading ? "Searching stays…" : `${units.length} stay${units.length === 1 ? "" : "s"}`}
          </h1>
          {activeFilters.length > 0 && <p className="mt-0.5 text-sm text-muted">{activeFilters.join(" · ")}</p>}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </Button>
      </div>

      {showFilters && (
        <div className="card-surface mt-4 rounded-3xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Max price / night</h3>
            <span className="text-sm font-semibold text-brand-600">₹{maxPrice.toLocaleString("en-IN")}</span>
          </div>
          <input type="range" min="1000" max={PRICE_MAX} step="500" value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))} className="mt-3 w-full accent-brand-500" />
        </div>
      )}

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <PropertyCardSkeleton key={i} />)
          : units.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
      </div>

      {!loading && !error && units.length === 0 && (
        <EmptyState
          className="mt-10"
          icon={MapPinned}
          title="No stays found"
          description="No published stays match your search yet. Try widening your dates or price, or check back soon."
          action={<Button onClick={() => setMaxPrice(PRICE_MAX)}>Reset filters</Button>}
        />
      )}
    </div>
  );
}
