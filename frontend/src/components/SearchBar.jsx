import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, CalendarDays, Users } from "lucide-react";
import { cn } from "../lib/cn";

// Hero hotel-search bar. Compact 2x2 grid on phones, single horizontal pill on md+.
export default function SearchBar({ className }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ where: "", checkIn: "", checkOut: "", guests: "" });

  const submit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => v && p.set(k, v));
    navigate(`/listings?${p.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className={cn(
        "w-full rounded-2xl bg-white p-2 shadow-soft-lg",
        className
      )}
    >
      <div className="grid grid-cols-2 gap-1.5 md:flex md:items-stretch md:gap-0">
        <Field icon={MapPin} label="Location" className="md:flex-1">
          <input
            value={form.where}
            onChange={(e) => setForm({ ...form, where: e.target.value })}
            placeholder="Where to?"
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
        </Field>
        <Divider />
        <Field icon={CalendarDays} label="Check in" className="md:flex-1">
          <input type="date" value={form.checkIn}
            onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            className="w-full bg-transparent text-sm text-zinc-600 outline-none" />
        </Field>
        <Divider />
        <Field icon={CalendarDays} label="Check out" className="md:flex-1">
          <input type="date" value={form.checkOut}
            onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
            className="w-full bg-transparent text-sm text-zinc-600 outline-none" />
        </Field>
        <Divider />
        <Field icon={Users} label="Guests" className="md:flex-1">
          <input type="number" min="1" value={form.guests}
            onChange={(e) => setForm({ ...form, guests: e.target.value })}
            placeholder="Add guests"
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" />
        </Field>
        <button
          type="submit"
          className="col-span-2 mt-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-600 md:col-auto md:mt-0 md:shrink-0 md:px-7"
        >
          <Search className="h-4 w-4" /> Search
        </button>
      </div>
    </form>
  );
}

function Field({ icon: Icon, label, className, children }) {
  return (
    <label className={cn("flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-muted-light", className)}>
      <Icon className="h-4 w-4 shrink-0 text-brand-500" />
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-semibold text-zinc-500">{label}</span>
        {children}
      </span>
    </label>
  );
}

const Divider = () => (
  <span className="mx-0.5 hidden w-px self-stretch bg-hair-light md:block" />
);
