import { cn } from "../../lib/cn";

export default function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "card-surface rounded-3xl shadow-card",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
