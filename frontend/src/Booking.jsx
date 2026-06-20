import { useState } from "react";
import { createBooking, payBooking } from "./api";

// Guest checkout: collect details -> create a hold + deposit intent ->
// pay the deposit (mock gateway) -> confirmed. Mirrors the hold-then-pay flow.
export default function Booking({ unit, dates, onDone }) {
  const [guest, setGuest] = useState({ guest_name: "", guest_email: "", guest_phone: "" });
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function hold(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body = {
        guest_name: guest.guest_name,
        guest_email: guest.guest_email,
        guest_phone: guest.guest_phone || null,
        check_in: dates.check_in,
        check_out: dates.check_out,
      };
      const res = await createBooking(unit.id, body);
      setBooking(res.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setError(null);
    setBusy(true);
    try {
      const confirmed = await payBooking(booking.id);
      setBooking(confirmed);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = { display: "block", width: "100%", margin: "0.35rem 0" };

  if (booking?.status === "confirmed") {
    return (
      <div style={{ border: "1px solid #cfe8cf", background: "#f4fbf4", padding: 16, borderRadius: 8 }}>
        <h3>Booking confirmed 🎉</h3>
        <p>{unit.title} · {booking.check_in} → {booking.check_out} ({booking.nights} night/s)</p>
        <p>Deposit paid: {booking.currency} {booking.deposit_amount}</p>
        <p>Pay at property: {booking.currency} {booking.balance_amount}</p>
        <p style={{ color: "#666" }}>Booking ref: {booking.id}</p>
        <button onClick={onDone}>Done</button>
      </div>
    );
  }

  if (booking?.status === "pending") {
    return (
      <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
        <h3>Confirm & pay deposit</h3>
        <p>{unit.title} · {booking.check_in} → {booking.check_out}</p>
        <p>Subtotal: {booking.currency} {booking.subtotal}</p>
        <p><strong>Pay now (deposit): {booking.currency} {booking.deposit_amount}</strong></p>
        <p>Balance at property: {booking.currency} {booking.balance_amount}</p>
        <p style={{ color: "#999", fontSize: 12 }}>
          Dev mode: mock payment gateway — no real charge.
        </p>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button onClick={pay} disabled={busy}>
          {busy ? "Processing…" : `Pay deposit`}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={hold} style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, maxWidth: 360 }}>
      <h3>Book {unit.title}</h3>
      <p>{dates.check_in} → {dates.check_out}</p>
      <input style={field} placeholder="Full name" required value={guest.guest_name}
        onChange={(e) => setGuest({ ...guest, guest_name: e.target.value })} />
      <input style={field} type="email" placeholder="Email" required value={guest.guest_email}
        onChange={(e) => setGuest({ ...guest, guest_email: e.target.value })} />
      <input style={field} placeholder="Phone (optional)" value={guest.guest_phone}
        onChange={(e) => setGuest({ ...guest, guest_phone: e.target.value })} />
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Holding…" : "Continue to payment"}</button>
    </form>
  );
}
