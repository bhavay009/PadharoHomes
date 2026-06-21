import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Logo from "./Logo";

// Split-screen auth shell: branded panel + form. Stacks on mobile.
export default function AuthLayout({ children }) {
  return (
    <div className="container-px grid min-h-[calc(100dvh-5rem)] items-start gap-8 py-6 sm:py-10 lg:grid-cols-2 lg:items-center lg:gap-10">
      {/* Form side */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-md"
      >
        <Logo className="mb-8" />
        {children}
      </motion.div>

      {/* Brand panel */}
      <div className="relative hidden h-full min-h-[560px] overflow-hidden rounded-4xl lg:block">
        <img
          src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <div className="mb-3 flex items-center gap-1 text-sm font-medium">
            <Star className="h-4 w-4 fill-current" /> 4.9 · Loved by 50k+ guests
          </div>
          <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight">
            Book unique stays, directly with hosts.
          </h2>
          <p className="mt-2 max-w-sm text-white/80">
            Zero booking fees, secure deposits, and real relationships with the
            people who host you.
          </p>
        </div>
      </div>
    </div>
  );
}
