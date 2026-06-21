import { useCallback, useEffect, useState } from "react";
import {
  getMetrics, listHostBookings,
  checkInBooking, completeBooking, noShowBooking, hostCancelBooking,
} from "./api";

const STATUSES = ["", "pending", "confirmed", "checked_in", "completed", "cancelled", "no_show", "expired"];

export default function HostBookings() {
  const [metrics, setMetrics] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMetrics(await getMetrics());
      setBookings((await listHostBookings({ status })).items);
    } catch (err) {
      setError(err.message);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function act(fn) {
    setError(null);
    try { await fn(); load(); } catch (err) { setError(err.message); }
  }

  const c = metrics?.currency ?? "";

  return (
    <section>
      <h2>Dashboard</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {metrics && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "0.5rem 0 1rem" }}>
          <Metric label="Units" value={`${metrics.published_units}/${metrics.total_units} published`} />
          <Metric label="Revenue booked" value={`${c} ${metrics.revenue_booked}`} />
          <Metric label="Cash collected" value={`${c} ${metrics.cash_collected}`} />
          <Metric label="Outstanding balance" value={`${c} ${metrics.outstanding_balance}`} />
          <Metric label={`Commission saved (${metrics.ota_commission_percent}%)`} value={`${c} ${metrics.commission_saved}`} />
          <Metric label={`Occupancy (${metrics.occupancy_window_days}d)`} value={`${metrics.occupancy_percent}%`} />
        </div>
      )}

      <h3>Bookings</h3>
      <label>Filter status:{" "}
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || "any"}</option>)}
        </select>
      </label>

      {bookings.length === 0 ? <p>No bookings.</p> : (
        <table cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", marginTop: 8 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
              <th>Guest</th><th>Dates</th><th>Total</th><th>Deposit</th><th>Balance</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>{b.guest_name}<br /><span style={{ color: "#888", fontSize: 12 }}>{b.guest_email}</span></td>
                <td>{b.check_in} → {b.check_out}</td>
                <td>{b.currency} {b.subtotal}</td>
                <td>{b.deposit_amount}{b.deposit_paid_at ? " ✓" : ""}</td>
                <td>{b.balance_amount}{b.balance_collected_at ? " ✓" : ""}</td>
                <td>{b.status}</td>
                <td>
                  {b.status === "confirmed" && (
                    <>
                      <button onClick={() => act(() => checkInBooking(b.id))}>Check in</button>{" "}
                      <button onClick={() => act(() => noShowBooking(b.id))}>No-show</button>{" "}
                      <button onClick={() => act(() => hostCancelBooking(b.id))}>Cancel</button>
                    </>
                  )}
                  {b.status === "checked_in" && (
                    <>
                      <button onClick={() => act(() => completeBooking(b.id, true))}>Complete (balance paid)</button>{" "}
                      <button onClick={() => act(() => completeBooking(b.id, false))}>Complete (unpaid)</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px", minWidth: 140 }}>
      <div style={{ color: "#888", fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
