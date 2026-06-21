/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF2EF",
          100: "#FFE2DC",
          200: "#FFC8BD",
          300: "#FFA293",
          400: "#FF7866",
          500: "#FB5D4D", // primary coral
          600: "#ED3F2D",
          700: "#C82E1F",
          800: "#A4281C",
          900: "#87271D",
        },
        cream: "#F7F7F8",
        bg: { light: "#FFFFFF", dark: "#0B0B0F" },
        surface: { light: "#FFFFFF", dark: "#16161D" },
        muted: { light: "#F6F6F7", dark: "#1B1B22" },
        hair: { light: "#ECECEE", dark: "#262630" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "ui-sans-serif", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(16,24,40,0.06), 0 4px 16px -4px rgba(16,24,40,0.08)",
        "soft-lg": "0 8px 24px -6px rgba(16,24,40,0.10), 0 16px 48px -8px rgba(16,24,40,0.12)",
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
      },
      maxWidth: { container: "1200px" },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { shimmer: "shimmer 1.5s infinite" },
    },
  },
  plugins: [],
};
