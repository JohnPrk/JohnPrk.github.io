import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        serif: ["ui-serif", "Georgia", "serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#f8fafc",
          soft: "#cbd5e1",
          muted: "#cbd5e1",
          faint: "#64748b",
          line: "rgba(255, 255, 255, 0.1)",
          bg: "rgba(255, 255, 255, 0.04)",
          paper: "#020e06",
        },
        cat: {
          woowa: "#d97706",
          ai: "#7c3aed",
          dev: "#059669",
        },
      },
    },
  },
  plugins: [],
};

export default config;
