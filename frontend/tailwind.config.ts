/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        space: {
          dark: "#020408",
          deeper: "#010205",
          nebula: "#0a0e1a",
        },
        glow: {
          blue: "#3b82f6",
          cyan: "#06b6d4",
          orange: "#f97316",
          yellow: "#fbbf24",
          green: "#22c55e",
          purple: "#a855f7",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 20s linear infinite",
      },
    },
  },
  plugins: [],
};
