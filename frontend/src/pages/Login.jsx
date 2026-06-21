import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import OtpInput from "../components/ui/OtpInput";
import { useAuth } from "../auth/AuthProvider";
import { requestOtp, verifyOtp, setToken } from "../api";

// Passwordless email-OTP login wired to the real backend (request-otp -> verify-otp).
// In dev mode the backend returns the code; we surface it on screen.
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  // If they were headed to a host page, they're a host; otherwise a guest.
  const from = location.state?.from?.pathname;
  const isHost = !!from && from.startsWith("/host");
  const dest = isHost ? from : "/account";

  const [step, setStep] = useState("email");
  const [method, setMethod] = useState("email"); // "email" | "phone"
  // Remember the last email this device logged in with.
  const [email, setEmail] = useState(() => localStorage.getItem("padharo_last_email") || "");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const idObj = method === "email" ? { email } : { phone };
  const identifierLabel = method === "email" ? email : phone;

  const sendCode = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await requestOtp(idObj);
      setDevOtp(res.dev_otp ?? null);
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await verifyOtp(idObj, code);
      setToken(res.access_token);
      if (res.host.email) localStorage.setItem("padharo_last_email", res.host.email);
      login({ email: res.host.email, phone: res.host.phone, role: isHost ? "host" : "guest", is_admin: res.host.is_admin });
      navigate(dest, { replace: true, state: isHost ? { tab: "bookings" } : undefined });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.div key="email" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-muted">Log in with a one-time code — no password needed.</p>

            {/* Email / Phone toggle */}
            <div className="mt-6 inline-flex rounded-full border border-hair-light bg-muted-light p-1">
              {["email", "phone"].map((m) => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${method === m ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"}`}>
                  {m}
                </button>
              ))}
            </div>

            <form onSubmit={sendCode} className="mt-4 space-y-4">
              {method === "email" ? (
                <label className="block">
                  <span className="text-sm font-medium">Email</span>
                  <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-hair-light bg-white px-4 focus-within:border-brand-400">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12 w-full bg-transparent text-sm outline-none" />
                  </div>
                </label>
              ) : (
                <label className="block">
                  <span className="text-sm font-medium">Phone number</span>
                  <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-hair-light bg-white px-4 focus-within:border-brand-400">
                    <Phone className="h-4 w-4 text-zinc-400" />
                    <input type="tel" required autoFocus value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="h-12 w-full bg-transparent text-sm outline-none" />
                  </div>
                </label>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted">
              New to Padharo Homes?{" "}
              <Link to="/signup" state={{ from: location.state?.from }} className="font-semibold text-brand-600 hover:underline">Create an account</Link>
            </p>
          </motion.div>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
            <button onClick={() => setStep("email")} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-brand-500">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Enter your code</h1>
            <p className="mt-2 text-muted">
              We sent a 6-digit code to <span className="font-semibold text-zinc-800">{identifierLabel}</span>.
            </p>

            {devOtp && (
              <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                Dev mode — your code is <strong className="tracking-widest">{devOtp}</strong>
                <span className="block text-xs text-brand-600/80">(shown here because no email provider is configured)</span>
              </div>
            )}

            <form onSubmit={verify} className="mt-6 space-y-5">
              <OtpInput value={code} onChange={setCode} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={busy || code.length < 6}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & continue"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              Didn't get it? <button onClick={sendCode} className="font-semibold text-brand-600 hover:underline">Resend code</button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}

