import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        celo: {
          green: "#35D07F",
          gold: "#FBCC5C",
          dark: "#2E3338",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
