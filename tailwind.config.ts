import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#060d1a",
          900: "#0B1426",
          800: "#111f3a",
          700: "#1a2e52",
        },
        electric: {
          600: "#1557b8",
          500: "#1E6FD9",
          400: "#3b82f6",
          300: "#93c5fd",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
