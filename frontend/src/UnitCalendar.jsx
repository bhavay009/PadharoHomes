import { useCallback, useEffect, useState } from "react";
import {
  listBlocks, createBlock, deleteBlock,
  listRates, createRate, deleteRate,
  getQuote,
} from "./api";

// Availability & pricing manager for a single unit:
// block/unblock date ranges, seasonal rates, and a live quote preview.
export default function UnitCalendar({ unit, onBack }) {
  const [blocks, setBlocks] = useState([]);
  const [rates, setRates] = useState([]);
  const [error, setError] = useState(null);

  const [block, setBlock] = useState({ start_date: "", end_date: "", reason: "" });
  const [rate, setRate] = useState({ start_date: "", end_date: "", price: "" });
  const [quoteReq, setQuoteReq] = useState({ check_in: "", check_out: "" });
  const [quote, setQuote] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setBlocks(await listBlocks(unit.id));
      setRates(await listRates(unit.id));
    } catch (err) {
      setError(err.message);
    }
  }, [unit.id]);

  useEffect(() => { load(); }, [load]);

  async function run(fn) {
    setError(null);
    try { await fn(); } catch (err) { setError(err.message); }
  }

  const addBlock = () => run(async () => {
    await createBlock(unit.id, block);
    setBlock({ start_date: "", end_date: "", reason: "" });
    load();
  });
  const addRate = () => run(async () => {
    await createRate(unit.id, rate);
    setRate({ start_date: "", end_date: "", price: "" });
    load();
  });
  const doQuote = () => run(async () => {
    setQuote(await getQuote(unit.id, quoteReq.check_in, quoteReq.check_out));
  });

  return (
    <section>
      <button onClick={onBack}>← Back</button>
      <h2>Availability & pricing — {unit.title}</h2>
      <p style={{ color: "#666" }}>
        {unit.currency} {unit.base_price}/night · weekend{" "}
        {unit.weekend_price ?? "—"} · min stay {unit.min_stay_nights} night(s)
      </p>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <h3>Blocked dates</h3>
      <ul>
        {blocks.map((b) => (
          <li key={b.id}>
            {b.start_date} → {b.end_date} {b.reason ? `(${b.reason})` : ""}{" "}
            <button onClick={() => run(async () => { await deleteBlock(unit.id, b.id); load(); })}>
              remove
            </button>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="date" value={block.start_date}
          onChange={(e) => setBlock({ ...block, start_date: e.target.value })} />
        <input type="date" value={block.end_date}
          onChange={(e) => setBlock({ ...block, end_date: e.target.value })} />
        <input placeholder="reason" value={block.reason}
          onChange={(e) => setBlock({ ...block, reason: e.target.value })} />
        <button onClick={addBlock}>Block dates</button>
      </div>

      <h3>Seasonal rates</h3>
      <ul>
        {rates.map((r) => (
          <li key={r.id}>
            {r.start_date} → {r.end_date}: {unit.currency} {r.price}{" "}
            <button onClick={() => run(async () => { await deleteRate(unit.id, r.id); load(); })}>
              remove
            </button>
          </li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="date" value={rate.start_date}
          onChange={(e) => setRate({ ...rate, start_date: e.target.value })} />
        <input type="date" value={rate.end_date}
          onChange={(e) => setRate({ ...rate, end_date: e.target.value })} />
        <input type="number" placeholder="price" value={rate.price}
          onChange={(e) => setRate({ ...rate, price: e.target.value })} />
        <button onClick={addRate}>Add rate</button>
      </div>

      <h3>Quote preview</h3>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="date" value={quoteReq.check_in}
          onChange={(e) => setQuoteReq({ ...quoteReq, check_in: e.target.value })} />
        <input type="date" value={quoteReq.check_out}
          onChange={(e) => setQuoteReq({ ...quoteReq, check_out: e.target.value })} />
        <button onClick={doQuote}>Get quote</button>
      </div>
      {quote && (
        <div style={{ marginTop: 8 }}>
          <p>
            {quote.nights} night(s) · subtotal {quote.currency} {quote.subtotal} ·
            deposit {quote.deposit_due} · balance {quote.balance_due}
          </p>
          <ul>
            {quote.nightly.map((n) => (
              <li key={n.date}>{n.date}: {quote.currency} {n.price} ({n.source})</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
