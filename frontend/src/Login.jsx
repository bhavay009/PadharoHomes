import { useState } from "react";
import { requestOtp, verifyOtp, setToken } from "./api";

// Two-step passwordless login: enter email -> enter the OTP.
// In dev mode the backend returns the code (dev_otp); we surface it so the
// flow is usable without an email provider. This is clearly labelled dev-only.
export default function Login({ onLoggedIn }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await requestOtp(email);
      setDevOtp(res.dev_otp ?? null);
      setStep("code");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await verifyOtp(email, code);
      setToken(res.access_token);
      onLoggedIn(res.host);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 360 }}>
      <h2>Host login</h2>
      {step === "email" && (
        <form onSubmit={handleRequest}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ display: "block", width: "100%", margin: "0.5rem 0" }}
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerify}>
          <p>
            Code sent to <strong>{email}</strong>.
          </p>
          {devOtp && (
            <p style={{ background: "#fff3cd", padding: "0.5rem" }}>
              Dev mode — your code is <strong>{devOtp}</strong> (no email
              provider wired yet).
            </p>
          )}
          <label>
            Enter code
            <input
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ display: "block", width: "100%", margin: "0.5rem 0" }}
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Verifying…" : "Verify & sign in"}
          </button>{" "}
          <button type="button" onClick={() => setStep("email")} disabled={busy}>
            Back
          </button>
        </form>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}
