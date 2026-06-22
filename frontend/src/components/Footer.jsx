import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Globe, AtSign, Send, MessageCircle, Apple, Play } from "lucide-react";
import Logo from "./Logo";

const COLS = [
  { title: "Explore", links: ["Browse stays", "Guest favorites", "How it works", "Cities"] },
  { title: "Hosting", links: ["Become a host", "List your property", "Host dashboard", "Why host with us"] },
  { title: "Legal", links: ["Terms of Service", "Privacy Policy", "Cancellation Policy", "Refund Policy"] },
];

const PAYMENTS = ["Visa", "Mastercard", "Amex", "PayPal"];

// Map known labels to real routes; everything else stays a placeholder link.
const ROUTES = {
  "Terms of Service": "/terms", "Privacy Policy": "/privacy",
  Terms: "/terms", Privacy: "/privacy",
};
function FootLink({ label, className }) {
  const to = ROUTES[label];
  return to
    ? <Link to={to} className={className}>{label}</Link>
    : <a href="#" className={className}>{label}</a>;
}

export default function Footer() {
  return (
    <footer className="border-t border-hair-light bg-white dark:border-hair-dark dark:bg-bg-dark">
      <div className="container-px grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-6">
        {/* Brand + contact */}
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">
            Book unique homes directly with the people who host them — zero commission,
            secure deposits, and real relationships with your hosts across India.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-500" /> hello@padharostays.com</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-500" /> +91 84486 19046</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-500" /> Gurugram, India</li>
          </ul>
        </div>

        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l}><FootLink label={l} className="text-sm text-muted transition-colors hover:text-brand-500" /></li>
              ))}
            </ul>
          </div>
        ))}

        {/* App + social */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-600">Get the App</h4>
          <div className="mt-4 space-y-2">
            <AppBadge icon={Apple} top="Download on the" bottom="App Store" />
            <AppBadge icon={Play} top="Get it on" bottom="Google Play" />
          </div>
          <h4 className="mt-6 text-xs font-bold uppercase tracking-wider text-brand-600">Follow Us</h4>
          <div className="mt-3 flex gap-2">
            {[Globe, AtSign, Send, MessageCircle].map((Icon, i) => (
              <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full border border-hair-light text-zinc-500 transition-colors hover:border-brand-300 hover:text-brand-500 dark:border-hair-dark">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-hair-light dark:border-hair-dark">
        <div className="container-px flex flex-col items-center justify-between gap-4 py-5 text-sm text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Padharo Homes. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {["Terms", "Privacy", "Cookies", "Sitemap"].map((l) => (
              <FootLink key={l} label={l} className="hover:text-brand-500" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">We accept</span>
            {PAYMENTS.map((p) => (
              <span key={p} className="rounded-md border border-hair-light px-2 py-1 text-[10px] font-bold text-zinc-500 dark:border-hair-dark">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function AppBadge({ icon: Icon, top, bottom }) {
  return (
    <a href="#" className="flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2 text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
      <Icon className="h-5 w-5" />
      <span className="leading-tight">
        <span className="block text-[9px] uppercase opacity-70">{top}</span>
        <span className="block text-sm font-semibold">{bottom}</span>
      </span>
    </a>
  );
}
