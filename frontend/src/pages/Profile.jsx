import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check, Loader2, X, Plus, Globe, Clock } from "lucide-react";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { getProfile, updateProfile, uploadAvatar } from "../api";
import { useAuth } from "../auth/AuthProvider";

const RESPONSE_TIMES = ["within an hour", "within a few hours", "within a day", "a few days"];
const inputCls = "mt-1.5 w-full rounded-2xl border border-hair-light bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-400";

export default function Profile() {
  const { login, user } = useAuth();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [lang, setLang] = useState("");

  useEffect(() => {
    getProfile()
      .then((p) => setForm({
        full_name: p.full_name || "", bio: p.bio || "",
        languages: p.languages || [], response_time: p.response_time || "",
        phone: p.phone || "", avatar_url: p.avatar_url || "", email: p.email,
      }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addLang = () => {
    const v = lang.trim();
    if (v && !form.languages.includes(v)) set("languages", [...form.languages, v]);
    setLang("");
  };

  async function onAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setUploading(true);
    try {
      const p = await uploadAvatar(file);
      set("avatar_url", p.avatar_url);
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  }

  async function save(e) {
    e.preventDefault();
    setError(null); setSaving(true); setSaved(false);
    try {
      const p = await updateProfile({
        full_name: form.full_name, bio: form.bio || null,
        languages: form.languages, response_time: form.response_time || null,
        phone: form.phone || null,
      });
      // keep the navbar name in sync
      login({ email: p.email, phone: p.phone, name: p.full_name || user?.name, role: user?.role, is_admin: user?.is_admin });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  if (loading) {
    return <div className="container-px py-8"><div className="mx-auto max-w-xl space-y-4"><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div></div>;
  }
  if (!form) return <div className="container-px py-8"><p className="text-red-600">{error}</p></div>;

  return (
    <div className="container-px py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted">This is what guests see on your listings.</p>

        <form onSubmit={save} className="mt-6 space-y-6">
          {/* Avatar */}
          <div className="card-surface flex items-center gap-5 rounded-3xl p-6 shadow-card">
            <div className="relative">
              {form.avatar_url
                ? <img src={form.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
                : <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-500 text-2xl font-bold text-white">{(form.full_name || form.email || form.phone || "U")[0]?.toUpperCase()}</div>}
              <button type="button" onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-white text-zinc-700 shadow ring-1 ring-black/5">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
            </div>
            <div>
              <p className="font-semibold">{form.full_name || "Your name"}</p>
              <p className="text-sm text-muted">{form.email || form.phone}</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 text-sm font-medium text-brand-600 hover:underline">Change photo</button>
            </div>
          </div>

          <div className="card-surface space-y-4 rounded-3xl p-6 shadow-card">
            <label className="block">
              <span className="text-sm font-medium">Full name</span>
              <input className={inputCls} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Asha Rao" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">About you</span>
              <textarea rows={4} className={inputCls} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Tell guests a little about yourself and your hosting style." />
            </label>
            <div>
              <span className="text-sm font-medium">Languages you speak</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {form.languages.map((l) => (
                  <span key={l} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
                    {l} <button type="button" onClick={() => set("languages", form.languages.filter((x) => x !== l))}><X className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input className={inputCls + " mt-0 flex-1"} value={lang} onChange={(e) => setLang(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLang())} placeholder="Add a language" />
                <Button type="button" variant="secondary" onClick={addLang}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-medium">Typical response time</span>
              <select className={inputCls} value={form.response_time} onChange={(e) => set("response_time", e.target.value)}>
                <option value="">Select…</option>
                {RESPONSE_TIMES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Contact phone</span>
              <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 ..." />
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save profile"}</Button>
            {saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Saved</motion.span>}
          </div>
        </form>
      </div>
    </div>
  );
}
