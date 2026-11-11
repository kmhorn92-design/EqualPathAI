import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#080B14", 900: "#080B14", 800: "#0D1220", 700: "#121827", 600: "#1A2236", 500: "#253049" },
        violet: { DEFAULT: "#8B5CF6", 300: "#C4B5FD", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED" },
        cyan: { DEFAULT: "#22D3EE", 300: "#67E8F9", 400: "#22D3EE", 500: "#06B6D4" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        fadeup: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
        spinslow: { to: { transform: "rotate(360deg)" } },
        pulseglow: { "0%,100%": { opacity: "0.5" }, "50%": { opacity: "1" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        fadeup: "fadeup .6s cubic-bezier(.2,.7,.2,1) both",
        spinslow: "spinslow 18s linear infinite",
        pulseglow: "pulseglow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
