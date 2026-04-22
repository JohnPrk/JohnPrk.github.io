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
          DEFAULT: "#0f0f10",
          soft: "#2a2a2d",
          muted: "#6b6b72",
          faint: "#a8a8b0",
          line: "#e8e8ec",
          bg: "#f6f6f8",
          paper: "#fafaf7",
        },
        cat: {
          woowa: "#d97706",
          ai: "#7c3aed",
          dev: "#059669",
        },
      },
      backgroundImage: {
        grid: "radial-gradient(circle, #e4e4ea 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-16": "16px 16px",
      },
    },
  },
  plugins: [],
};

export default config;
