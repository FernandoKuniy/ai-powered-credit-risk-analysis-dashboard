import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          500: "#6f5cff",
        },
        bg: "#0b0e13",
      },
    },
  },
  plugins: [],
};
export default config;