import { cn } from "../../lib/cn";

const VARIANTS = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm",
  secondary:
    "bg-white text-zinc-900 border border-hair-light hover:bg-muted-light dark:bg-surface-dark dark:text-zinc-100 dark:border-hair-dark dark:hover:bg-muted-dark",
  ghost:
    "text-zinc-700 hover:bg-muted-light dark:text-zinc-200 dark:hover:bg-muted-dark",
  dark:
    "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
};

const SIZES = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export default function Button({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) {
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
