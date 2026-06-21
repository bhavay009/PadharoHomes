import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Home, MapPin, Sparkles, ImagePlus, IndianRupee, CalendarRange,
  ShieldCheck, ClipboardCheck, Check, X, ArrowLeft, ArrowRight, Loader2,
  Star, Crosshair, GripVertical, Trash2, Plus,
} from "lucide-react";
import Button from "../components/ui/Button";
import { createUnit, uploadPhoto } from "../api";

const DRAFT_KEY = "padharo_listing_draft";
const MIN_PHOTOS = 5;
const MIN_DESC = 50;

const PROPERTY_TYPES = ["Apartment", "House", "Villa", "Cabin", "Farmhouse", "Hotel", "Cottage", "Bungalow"];
const AMENITIES = [
  "WiFi", "Air Conditioning", "Kitchen", "Washing Machine", "TV", "Parking",
  "Swimming Pool", "Gym", "Workspace", "Balcony", "Elevator", "Pet Friendly",
  "Hot Water", "Power Backup", "Security Cameras",
];

const STEPS = [
  { key: "basics", label: "Basics", icon: Home },
  { key: "location", label: "Location", icon: MapPin },
  { key: "amenities", label: "Amenities", icon: Sparkles },
  { key: "photos", label: "Photos", icon: ImagePlus },
  { key: "pricing", label: "Pricing", icon: IndianRupee },
  { key: "rules", label: "Availability & rules", icon: CalendarRange },
  { key: "safety", label: "Safety", icon: ShieldCheck },
  { key: "review", label: "Review & publish", icon: ClipboardCheck },
];

const BLANK = {
  title: "", property_type: "Apartment", description: "",
  capacity: 2, bedrooms: 1, beds: 1, bathrooms: 1,
  country: "India", state: "", city: "", address_line: "", pincode: "",
  latitude: "", longitude: "",
  amenities: [], custom_amenity: "",
  base_price: "", weekend_price: "", cleaning_fee: "", service_fee: "",
  security_deposit: "", taxes_percent: "", weekly_discount_percent: "",
  monthly_discount_percent: "", deposit_percent: "20",
  min_stay_nights: 1, max_stay_nights: "", instant_book: false,
  check_in_time: "14:00", check_out_time: "11:00",
  pets_allowed: false, smoking_allowed: false, parties_allowed: false, quiet_hours: "",
  smoke_alarm: true, fire_extinguisher: false, first_aid_kit: false, emergency_contact: "",
};

export default function CreateProperty() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => {
    try { return { ...BLANK, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") }; }
    catch { return BLANK; }
  });
  const [photos, setPhotos] = useState([]); // {id, file, url}
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // Auto-save draft (text fields only; photos can't be serialized).
  useEffect(() => {
    const t = setTimeout(() => {
      const { custom_amenity, ...persist } = form;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(persist));
      setSavedAt(new Date());
    }, 600);
    return () => clearTimeout(t);
  }, [form]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k) => setForm((f) => ({ ...f, [k]: !f[k] }));
  const toggleAmenity = (a) => setForm((f) => ({
    ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
  }));

  // ---- validation ----
  const errors = useMemo(() => {
    const e = {};
    if (!form.title.trim()) e.title = "Add a title";
    if ((form.description || "").trim().length < MIN_DESC) e.description = `Description must be at least ${MIN_DESC} characters`;
    if (!form.city.trim()) e.city = "City is required";
    if (!form.country.trim()) e.country = "Country is required";
    if (!form.address_line.trim()) e.address_line = "Address is required";
    if (!(Number(form.base_price) > 0)) e.base_price = "Set a nightly price";
    if (photos.length < MIN_PHOTOS) e.photos = `Add at least ${MIN_PHOTOS} photos (${photos.length}/${MIN_PHOTOS})`;
    return e;
  }, [form, photos.length]);

  const stepValid = (i) => {
    if (i === 0) return !errors.title && !errors.description;
    if (i === 1) return !errors.city && !errors.country && !errors.address_line;
    if (i === 3) return !errors.photos;
    if (i === 4) return !errors.base_price;
    return true;
  };
  const canPublish = Object.keys(errors).length === 0;

  // ---- photos ----
  const addFiles = (fileList) => {
    const imgs = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    setPhotos((p) => [...p, ...imgs.map((file) => ({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, file, url: URL.createObjectURL(file) }))]);
  };
  const removePhoto = (id) => setPhotos((p) => p.filter((x) => x.id !== id));

  // ---- payload ----
  const buildBody = () => {
    const num = (v) => (v === "" || v == null ? null : String(v));
    const allAmenities = [...form.amenities];
    return {
      title: form.title, property_type: form.property_type.toLowerCase(),
      description: form.description || null,
      country: form.country, state: form.state || null, city: form.city,
      address_line: form.address_line || null, pincode: form.pincode || null,
      latitude: form.latitude === "" ? null : Number(form.latitude),
      longitude: form.longitude === "" ? null : Number(form.longitude),
      capacity: Number(form.capacity) || 1, bedrooms: Number(form.bedrooms) || null,
      beds: Number(form.beds) || null, bathrooms: Number(form.bathrooms) || null,
      amenities: allAmenities,
      base_price: num(form.base_price), weekend_price: num(form.weekend_price),
      cleaning_fee: num(form.cleaning_fee), service_fee: num(form.service_fee),
      security_deposit: num(form.security_deposit), taxes_percent: num(form.taxes_percent),
      weekly_discount_percent: num(form.weekly_discount_percent),
      monthly_discount_percent: num(form.monthly_discount_percent),
      deposit_percent: num(form.deposit_percent) || "0",
      min_stay_nights: Number(form.min_stay_nights) || 1,
      max_stay_nights: form.max_stay_nights === "" ? null : Number(form.max_stay_nights),
      instant_book: form.instant_book,
      check_in_time: form.check_in_time || null, check_out_time: form.check_out_time || null,
      pets_allowed: form.pets_allowed, smoking_allowed: form.smoking_allowed,
      parties_allowed: form.parties_allowed, quiet_hours: form.quiet_hours || null,
      smoke_alarm: form.smoke_alarm, fire_extinguisher: form.fire_extinguisher,
      first_aid_kit: form.first_aid_kit, emergency_contact: form.emergency_contact || null,
      status: "published",
    };
  };

  async function publish() {
    if (!canPublish) { setError("Please complete all required fields before publishing."); return; }
    setError(null);
    setPublishing(true);
    try {
      const unit = await createUnit(buildBody());
      for (const p of photos) {
        try { await uploadPhoto(unit.id, p.file); } catch { /* skip a failed photo */ }
      }
      localStorage.removeItem(DRAFT_KEY);
      navigate("/host", { state: { tab: "listings" } });
    } catch (err) {
      setError(err.message);
      setPublishing(false);
    }
  }

  function saveAndExit() {
    const { custom_amenity, ...persist } = form;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(persist));
    navigate("/host");
  }

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="container-px py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">List your place</h1>
            <p className="mt-1 text-sm text-muted">
              {savedAt ? "Draft auto-saved" : "Your progress saves automatically"}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={saveAndExit}>Save &amp; exit</Button>
        </div>

        {/* Progress */}
        <Stepper steps={STEPS} current={step} onJump={(i) => setStep(i)} />

        {/* Step body */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
              {step === 0 && <Basics form={form} set={set} errors={errors} />}
              {step === 1 && <Location form={form} set={set} errors={errors} />}
              {step === 2 && <Amenities form={form} set={set} toggleAmenity={toggleAmenity} />}
              {step === 3 && <Photos photos={photos} setPhotos={setPhotos} addFiles={addFiles} removePhoto={removePhoto} error={errors.photos} />}
              {step === 4 && <Pricing form={form} set={set} errors={errors} />}
              {step === 5 && <Rules form={form} set={set} toggle={toggle} />}
              {step === 6 && <Safety form={form} set={set} toggle={toggle} />}
              {step === 7 && <Review form={form} photos={photos} errors={errors} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-between border-t border-hair-light pt-5">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={!stepValid(step)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={publish} disabled={!canPublish || publishing}>
              {publishing ? <Loader2 className="h-5 w-5 animate-spin" /> : "Publish listing"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Stepper ---------------- */
function Stepper({ steps, current, onJump }) {
  const pct = Math.round((current / (steps.length - 1)) * 100);
  return (
    <div className="mt-6">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted-light">
        <motion.div className="h-full rounded-full bg-brand-500" animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {steps.map((s, i) => {
          const done = i < current, active = i === current;
          return (
            <button key={s.key} onClick={() => onJump(i)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? "bg-brand-500 text-white" : done ? "bg-brand-50 text-brand-700" : "bg-muted-light text-zinc-500"
              }`}>
              {done ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />} {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- shared inputs ---------------- */
const inputCls = "mt-1.5 w-full rounded-2xl border border-hair-light bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-400";
function Field({ label, error, children, hint }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
function Section({ title, desc, children }) {
  return (
    <div className="card-surface rounded-3xl p-6 shadow-card">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}
function Counter({ label, value, onChange, min = 0 }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-hair-light px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(min, Number(value) - 1))}
          className="grid h-8 w-8 place-items-center rounded-full border border-hair-light hover:bg-muted-light">–</button>
        <span className="w-6 text-center text-sm font-semibold">{value}</span>
        <button type="button" onClick={() => onChange(Number(value) + 1)}
          className="grid h-8 w-8 place-items-center rounded-full border border-hair-light hover:bg-muted-light">+</button>
      </div>
    </div>
  );
}
function Toggle({ label, desc, checked, onChange }) {
  return (
    <button type="button" onClick={onChange}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-hair-light px-4 py-3 text-left">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {desc && <span className="block text-xs text-muted">{desc}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-500" : "bg-zinc-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[1.4rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/* ---------------- steps ---------------- */
function Basics({ form, set, errors }) {
  return (
    <Section title="Tell us about your place" desc="The essentials guests see first.">
      <Field label="Listing title" error={errors.title}>
        <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Sunlit sea-view villa in North Goa" />
      </Field>
      <Field label="Property type">
        <select className={inputCls} value={form.property_type} onChange={(e) => set("property_type", e.target.value)}>
          {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Description" error={errors.description} hint={`${(form.description || "").length}/${MIN_DESC} characters minimum`}>
        <textarea rows={4} className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What makes your place special? The view, the neighbourhood, the vibe…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Counter label="Guests" value={form.capacity} min={1} onChange={(v) => set("capacity", v)} />
        <Counter label="Bedrooms" value={form.bedrooms} onChange={(v) => set("bedrooms", v)} />
        <Counter label="Beds" value={form.beds} onChange={(v) => set("beds", v)} />
        <Counter label="Bathrooms" value={form.bathrooms} onChange={(v) => set("bathrooms", v)} />
      </div>
    </Section>
  );
}

function Location({ form, set, errors }) {
  const locate = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      set("latitude", pos.coords.latitude.toFixed(6));
      set("longitude", pos.coords.longitude.toFixed(6));
    });
  };
  return (
    <Section title="Where's your place located?" desc="Guests only see the exact address after booking.">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country" error={errors.country}><input className={inputCls} value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
        <Field label="State / region"><input className={inputCls} value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Haryana" /></Field>
        <Field label="City" error={errors.city}><input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Gurugram" /></Field>
        <Field label="ZIP / Postal code"><input className={inputCls} value={form.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="122001" /></Field>
      </div>
      <Field label="Full address" error={errors.address_line}>
        <input className={inputCls} value={form.address_line} onChange={(e) => set("address_line", e.target.value)} placeholder="Flat / house no, street, area" />
      </Field>
      <div className="rounded-2xl border border-hair-light p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Map coordinates</span>
          <div className="flex gap-2">
            <button type="button" onClick={locate} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"><Crosshair className="h-3.5 w-3.5" /> Use my location</button>
            <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"><MapPin className="h-3.5 w-3.5" /> Open Maps</a>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input className={inputCls} value={form.latitude} onChange={(e) => set("latitude", e.target.value)} placeholder="Latitude" />
          <input className={inputCls} value={form.longitude} onChange={(e) => set("longitude", e.target.value)} placeholder="Longitude" />
        </div>
        <p className="mt-2 text-xs text-muted">Tip: right-click your spot on Google Maps to copy lat/long.</p>
      </div>
    </Section>
  );
}

function Amenities({ form, set, toggleAmenity }) {
  const addCustom = () => {
    const v = form.custom_amenity.trim();
    if (v && !form.amenities.includes(v)) toggleAmenity(v);
    set("custom_amenity", "");
  };
  const customs = form.amenities.filter((a) => !AMENITIES.includes(a));
  return (
    <Section title="What does your place offer?" desc="Pick all the amenities guests can use.">
      <div className="flex flex-wrap gap-2">
        {AMENITIES.map((a) => {
          const on = form.amenities.includes(a);
          return (
            <button key={a} type="button" onClick={() => toggleAmenity(a)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-hair-light hover:bg-muted-light"}`}>
              {on && <Check className="h-4 w-4" />} {a}
            </button>
          );
        })}
        {customs.map((a) => (
          <button key={a} type="button" onClick={() => toggleAmenity(a)}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-500 bg-brand-50 px-3.5 py-2 text-sm font-medium text-brand-700">
            <Check className="h-4 w-4" /> {a} <X className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input className={inputCls + " mt-0 flex-1"} value={form.custom_amenity}
          onChange={(e) => set("custom_amenity", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
          placeholder="Add a custom amenity (e.g. Private chef)" />
        <Button type="button" variant="secondary" onClick={addCustom}><Plus className="h-4 w-4" /> Add</Button>
      </div>
    </Section>
  );
}

function Photos({ photos, setPhotos, addFiles, removePhoto, error }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  return (
    <Section title="Add photos" desc={`Drag to reorder — the first photo is your cover. Minimum ${MIN_PHOTOS}.`}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          drag ? "border-brand-400 bg-brand-50" : "border-hair-light hover:bg-muted-light"}`}>
        <ImagePlus className="h-8 w-8 text-zinc-400" />
        <p className="mt-2 text-sm font-medium">Drag &amp; drop photos here, or click to browse</p>
        <p className="text-xs text-muted">PNG or JPG · {photos.length}/{MIN_PHOTOS} added</p>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {photos.length > 0 && (
        <Reorder.Group axis="y" values={photos} onReorder={setPhotos} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <Reorder.Item key={p.id} value={p} className="group relative overflow-hidden rounded-2xl">
              <img src={p.url} alt="" className="aspect-[4/3] w-full cursor-grab object-cover active:cursor-grabbing" />
              {i === 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold"><Star className="h-3 w-3 fill-brand-500 text-brand-500" /> Cover</span>}
              <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/40 text-white"><GripVertical className="h-3.5 w-3.5" /></span>
              <button type="button" onClick={(e) => { e.stopPropagation(); removePhoto(p.id); }}
                className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-white text-red-600 opacity-0 shadow transition-opacity group-hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </Section>
  );
}

function Pricing({ form, set, errors }) {
  const money = (label, key, hint) => (
    <Field label={label} hint={hint}>
      <input type="number" min="0" className={inputCls} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder="₹" />
    </Field>
  );
  return (
    <Section title="Set your pricing" desc="You only collect a deposit online; the balance is paid at the property.">
      <Field label="Base price / night" error={errors.base_price}>
        <input type="number" min="1" className={inputCls} value={form.base_price} onChange={(e) => set("base_price", e.target.value)} placeholder="₹3000" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {money("Weekend price / night", "weekend_price", "Optional")}
        {money("Cleaning fee", "cleaning_fee", "One-time")}
        {money("Service fee", "service_fee", "One-time")}
        {money("Security deposit", "security_deposit", "Refundable")}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Deposit %" hint="Paid online"><input type="number" min="0" max="100" className={inputCls} value={form.deposit_percent} onChange={(e) => set("deposit_percent", e.target.value)} /></Field>
        <Field label="Taxes %"><input type="number" min="0" max="100" className={inputCls} value={form.taxes_percent} onChange={(e) => set("taxes_percent", e.target.value)} /></Field>
        <Field label="Weekly disc %"><input type="number" min="0" max="100" className={inputCls} value={form.weekly_discount_percent} onChange={(e) => set("weekly_discount_percent", e.target.value)} /></Field>
      </div>
      <Field label="Monthly discount %"><input type="number" min="0" max="100" className={inputCls} value={form.monthly_discount_percent} onChange={(e) => set("monthly_discount_percent", e.target.value)} /></Field>
    </Section>
  );
}

function Rules({ form, set, toggle }) {
  return (
    <div className="space-y-4">
      <Section title="Availability">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum stay (nights)"><input type="number" min="1" className={inputCls} value={form.min_stay_nights} onChange={(e) => set("min_stay_nights", e.target.value)} /></Field>
          <Field label="Maximum stay (nights)" hint="Optional"><input type="number" min="1" className={inputCls} value={form.max_stay_nights} onChange={(e) => set("max_stay_nights", e.target.value)} /></Field>
        </div>
        <Toggle label="Instant booking" desc="Let guests book without manual approval" checked={form.instant_book} onChange={() => toggle("instant_book")} />
      </Section>
      <Section title="House rules">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in time"><input type="time" className={inputCls} value={form.check_in_time} onChange={(e) => set("check_in_time", e.target.value)} /></Field>
          <Field label="Check-out time"><input type="time" className={inputCls} value={form.check_out_time} onChange={(e) => set("check_out_time", e.target.value)} /></Field>
        </div>
        <Toggle label="Pets allowed" checked={form.pets_allowed} onChange={() => toggle("pets_allowed")} />
        <Toggle label="Smoking allowed" checked={form.smoking_allowed} onChange={() => toggle("smoking_allowed")} />
        <Toggle label="Parties / events allowed" checked={form.parties_allowed} onChange={() => toggle("parties_allowed")} />
        <Field label="Quiet hours" hint="e.g. 10 PM – 7 AM"><input className={inputCls} value={form.quiet_hours} onChange={(e) => set("quiet_hours", e.target.value)} /></Field>
      </Section>
    </div>
  );
}

function Safety({ form, set, toggle }) {
  return (
    <Section title="Safety information" desc="Reassure guests their stay is safe.">
      <Toggle label="Smoke alarm" checked={form.smoke_alarm} onChange={() => toggle("smoke_alarm")} />
      <Toggle label="Fire extinguisher" checked={form.fire_extinguisher} onChange={() => toggle("fire_extinguisher")} />
      <Toggle label="First aid kit" checked={form.first_aid_kit} onChange={() => toggle("first_aid_kit")} />
      <Field label="Emergency contact" hint="Phone number guests can call"><input className={inputCls} value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} placeholder="+91 ..." /></Field>
    </Section>
  );
}

function Review({ form, photos, errors }) {
  const items = [
    ["Title", form.title], ["Type", form.property_type],
    ["Location", [form.city, form.state, form.country].filter(Boolean).join(", ")],
    ["Capacity", `${form.capacity} guests · ${form.bedrooms} bd · ${form.beds} beds · ${form.bathrooms} ba`],
    ["Price", form.base_price ? `₹${form.base_price}/night` : "—"],
    ["Amenities", form.amenities.length ? form.amenities.join(", ") : "—"],
    ["Photos", `${photos.length} added`],
  ];
  const checks = [
    ["Title added", !errors.title],
    [`Description ≥ ${MIN_DESC} chars`, !errors.description],
    ["Valid location", !errors.city && !errors.country && !errors.address_line],
    [`At least ${MIN_PHOTOS} photos`, !errors.photos],
    ["Nightly price set", !errors.base_price],
  ];
  return (
    <Section title="Review & publish" desc="Make sure everything looks right.">
      {photos[0] && <img src={photos[0].url} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />}
      <dl className="divide-y divide-hair-light">
        {items.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="max-w-[60%] text-right font-medium">{v || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-2xl bg-muted-light p-4">
        <p className="text-sm font-semibold">Publishing checklist</p>
        <ul className="mt-2 space-y-1.5">
          {checks.map(([label, ok]) => (
            <li key={label} className={`flex items-center gap-2 text-sm ${ok ? "text-zinc-700" : "text-red-600"}`}>
              {ok ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4" />} {label}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
