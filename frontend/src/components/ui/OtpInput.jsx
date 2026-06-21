import { useRef } from "react";

// 6-box one-time-code input. value is a string; onChange gets the full string.
export default function OtpInput({ value = "", onChange, length = 6 }) {
  const refs = useRef([]);
  const chars = value.padEnd(length).split("").slice(0, length);

  const setAt = (i, ch) => {
    const next = value.split("");
    next[i] = ch;
    onChange(next.join("").slice(0, length).replace(/\s/g, ""));
  };

  const handle = (i, e) => {
    const ch = e.target.value.replace(/\D/g, "").slice(-1);
    if (ch) {
      setAt(i, ch);
      if (i < length - 1) refs.current[i + 1]?.focus();
    }
  };

  const keyDown = (i, e) => {
    if (e.key === "Backspace") {
      if (chars[i].trim()) setAt(i, "");
      else if (i > 0) { setAt(i - 1, ""); refs.current[i - 1]?.focus(); }
    }
  };

  const paste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(digits);
    refs.current[Math.min(digits.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2 sm:gap-3" onPaste={paste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          value={chars[i].trim()}
          onChange={(e) => handle(i, e)}
          onKeyDown={(e) => keyDown(i, e)}
          className="h-12 w-full rounded-xl border border-hair-light bg-white text-center text-lg font-semibold outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30 sm:h-14 sm:rounded-2xl sm:text-xl"
        />
      ))}
    </div>
  );
}
