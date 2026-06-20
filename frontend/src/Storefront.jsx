import { useEffect, useState } from "react";
import { browseUnits, getPublicQuote } from "./api";

// Guest-facing storefront: browse published units, filter by city/guests/price
// and optional dates. With dates set, the API returns only available units.
export default function Storefront() {
  const [filters, setFilters] = useState({
    city: "", guests: "", min_price: "", max_price: "",
    check_in: "", check_out: "",
  });
  const [units, setUnits] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  async function search(e) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Dates must be sent as a pair or not at all.
      const f = { ...filters };
      if (!!f.check_in !== !!f.check_out) {
        throw new Error("Enter both check-in and check-out, or neither.");
      }
      const res = await browseUnits(f);
      setUnits(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { search(); }, []); // initial: all published units

  if (selected) {
    return (
      <Detail
        unit={selected}
        dates={{ check_in: filters.check_in, check_out: filters.check_out }}
        onBack={() => setSelected(null)}
      />
    );
  }

  const f = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <section>
      <h2>Browse stays</h2>
      <form onSubmit={search} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input placeholder="City" value={filters.city} onChange={f("city")} />
        <input type="number" min="1" placeholder="Guests" value={filters.guests} onChange={f("guests")} />
        <input type="number" placeholder="Min price" value={filters.min_price} onChange={f("min_price")} />
        <input type="number" placeholder="Max price" value={filters.max_price} onChange={f("max_price")} />
        <label>Check-in <input type="date" value={filters.check_in} onChange={f("check_in")} /></label>
        <label>Check-out <input type="date" value={filters.check_out} onChange={f("check_out")} /></label>
        <button type="submit">Search</button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {loading ? <p>Loading…</p> : (
        <>
          <p style={{ color: "#666" }}>{total} stay(s)</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {units.map((u) => (
              <div key={u.id} onClick={() => setSelected(u)}
                style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, width: 220, cursor: "pointer" }}>
                {u.photos?.[0] ? (
                  <img src={u.photos[0].url} alt="" width="196" height="120"
                    style={{ objectFit: "cover", borderRadius: 4 }} />
                ) : (
                  <div style={{ width: 196, height: 120, background: "#f0f0f0", borderRadius: 4 }} />
                )}
                <h4 style={{ margin: "8px 0 2px" }}>{u.title}</h4>
                <p style={{ margin: 0, color: "#666" }}>{u.city}</p>
                <p style={{ margin: "4px 0 0" }}>{u.currency} {u.base_price}/night</p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Detail({ unit, dates, onBack }) {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dates.check_in && dates.check_out) {
      getPublicQuote(unit.id, dates.check_in, dates.check_out)
        .then(setQuote)
        .catch((e) => setError(e.message));
    }
  }, [unit.id, dates.check_in, dates.check_out]);

  return (
    <section>
      <button onClick={onBack}>← Back to results</button>
      <h2>{unit.title}</h2>
      <p style={{ color: "#666" }}>{unit.city}, {unit.country} · up to {unit.capacity} guests</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {(unit.photos ?? []).map((p) => (
          <img key={p.id} src={p.url} alt="" width="200" height="140"
            style={{ objectFit: "cover", borderRadius: 4 }} />
        ))}
      </div>
      {unit.description && <p>{unit.description}</p>}
      {unit.amenities?.length > 0 && <p>Amenities: {unit.amenities.join(", ")}</p>}
      <p><strong>{unit.currency} {unit.base_price}</strong>/night
        {unit.weekend_price ? ` · weekend ${unit.weekend_price}` : ""}
        {` · min stay ${unit.min_stay_nights} night(s)`}</p>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {quote ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, maxWidth: 320 }}>
          <h4>Your dates</h4>
          <p>{quote.check_in} → {quote.check_out} · {quote.nights} night(s)</p>
          <p>Subtotal: {quote.currency} {quote.subtotal}</p>
          <p>Pay now (deposit {quote.deposit_percent}%): <strong>{quote.deposit_due}</strong></p>
          <p>Pay at property: {quote.balance_due}</p>
          <p style={{ color: "#999" }}>Booking arrives in the next phase.</p>
        </div>
      ) : (
        <p style={{ color: "#666" }}>Add check-in/check-out dates on the search page to see a price quote.</p>
      )}
    </section>
  );
}
