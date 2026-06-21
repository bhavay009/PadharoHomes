import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, User, ArrowRight, ArrowLeft, Loader2, Check } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import Button from "../components/ui/Button";
import OtpInput from "../components/ui/OtpInput";
import { useAuth } from "../auth/AuthProvider";
import { requestOtp, verifyOtp, setToken } from "../api";

const PERKS = ["Zero booking fees", "Secure deposits", "Direct host messaging"];

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = location.state?.from?.pathname;
  const isHost = !!from && from.startsWith("/host");
  const dest = isHost ? from : "/account";

  const [step, setStep] = useState("details");
  const [method, setMethod] = useState("email");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const idObj = method === "email" ? { email: form.email } : { phone: form.phone };
  const identifierLabel = method === "email" ? form.email : form.phone;

  const sendCode = async (e) => {
    e?.preventDefault();
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
      login({ email: res.host.email, phone: res.host.phone, name: form.name, role: isHost ? "host" : "guest", is_admin: res.host.is_admin });
      navigate(dest, { replace: true, state: isHost ? { tab: "listings" } : undefined });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <AnimatePresence mode="wait">
        {step === "details" ? (
          <motion.div key="details" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-2 text-muted">Start booking — or hosting — in minutes.</p>

            <ul className="mt-5 space-y-1.5">
              {PERKS.map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm text-muted">
                  <Check className="h-4 w-4 text-emerald-500" /> {p}
                </li>
              ))}
            </ul>

            <form onSubmit={sendCode} className="mt-7 space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Full name</span>
                <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-hair-light bg-white px-4 focus-within:border-brand-400 dark:border-hair-dark dark:bg-surface-dark">
                  <User className="h-4 w-4 text-zinc-400" />
                  <input required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Asha Rao" className="h-12 w-full bg-transparent text-sm outline-none" />
                </div>
              </label>
              <div className="inline-flex rounded-full border border-hair-light bg-muted-light p-1">
                {["email", "phone"].map((m) => (
                  <button key={m} type="button" onClick={() => setMethod(m)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${method === m ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600"}`}>
                    {m}
                  </button>
                ))}
              </div>
              {method === "email" ? (
                <label className="block">
                  <span className="text-sm font-medium">Email</span>
                  <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-hair-light bg-white px-4 focus-within:border-brand-400">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="h-12 w-full bg-transparent text-sm outline-none" />
                  </div>
                </label>
              ) : (
                <label className="block">
                  <span className="text-sm font-medium">Phone number</span>
                  <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-hair-light bg-white px-4 focus-within:border-brand-400">
                    <Phone className="h-4 w-4 text-zinc-400" />
                    <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" className="h-12 w-full bg-transparent text-sm outline-none" />
                  </div>
                </label>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted">
              By continuing you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a>.
            </p>
            <p className="mt-4 text-center text-sm text-muted">
              Already have an account?{" "}
              <Link to="/login" state={{ from: location.state?.from }} className="font-semibold text-brand-600 hover:underline">Log in</Link>
            </p>
          </motion.div>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
            <button onClick={() => setStep("details")} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-brand-500">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Verify your {method === "email" ? "email" : "number"}</h1>
            <p className="mt-2 text-muted">
              Enter the 6-digit code sent to <span className="font-semibold text-zinc-800">{identifierLabel}</span>.
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
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & get started"}
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
