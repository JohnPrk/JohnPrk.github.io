import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Pretendard", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#111111",
          soft: "#3a3a3a",
          muted: "#6b6b6b",
          line: "#e6e6e6",
          bg: "#fafafa",
        },
      },
    },
  },
  plugins: [],
};

export default config;
