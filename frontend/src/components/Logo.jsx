import { Link } from "react-router-dom";
import { cn } from "../lib/cn";

// Padharo Homes logo — terracotta house mark + wordmark.
// `light` renders the "Padharo" wordmark in white (for use over dark imagery).
function HouseMark({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Padharo Homes">
      {/* roof */}
      <path d="M32 7 L58 31 H6 Z" fill="#FB5D4D" strokeLinejoin="round" />
      {/* body */}
      <path d="M13 31 H51 V49 Q51 54 46 54 H18 Q13 54 13 49 Z" fill="#C82E1F" />
      {/* arched door */}
      <path d="M26.5 54 V41 Q26.5 35 32 35 Q37.5 35 37.5 41 V54 Z" fill="#FFF2EF" />
      {/* knob */}
      <circle cx="32" cy="46.5" r="3.1" fill="#FB5D4D" />
    </svg>
  );
}

export default function Logo({ light = false, className }) {
  return (
    <Link to="/" aria-label="Padharo Homes — home" className={cn("flex items-center gap-3", className)}>
      <HouseMark className="h-12 w-12 shrink-0" />
      <span className="leading-none">
        <span className={cn("block font-display text-2xl font-extrabold tracking-tight", light ? "text-white" : "text-zinc-900")}>
          Padharo
        </span>
        <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.4em] text-brand-500">
          homes
        </span>
      </span>
    </Link>
  );
}
