import type { Config } from "tailwindcss";
export default {
    content: [
        "./app/**/*.{ts,tsx}",
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                accent: {
                500: "#6f5cff",
                },
                bg: {
                    DEFAULT: "#0b0e13",
                },
            },
        },
    },
plugins: [],
} satisfies Config;