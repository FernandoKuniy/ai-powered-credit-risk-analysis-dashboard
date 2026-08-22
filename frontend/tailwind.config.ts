import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

/**
 * Tailwind v3, so tokens belong here rather than in an `@theme` block in the CSS.
 *
 * There is deliberately no brand color in the palette. Zinc carries every structural job and
 * the only extensions are the two page-level colors, which are declared as CSS variables in
 * globals.css so the light and dark values live in one place. Color that means something
 * (green for approve, amber for review, red for a factor that raises risk, indigo for the
 * model's own numbers) comes from Tailwind's own scales at the point of use, so a reader can
 * see which semantic they picked without chasing a config alias.
 *
 * `darkMode` is left at its v3 default of "media": dark mode follows the OS, and there is no
 * toggle to keep in sync.
 */
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
export default config;
