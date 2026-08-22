import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { AuthProvider } from "../lib/auth";
import SiteHeader from "./components/SiteHeader";

const description =
  "Score a loan application against a model trained on LendingClub data, and see which of the applicant's numbers moved the result.";

// Social cards need absolute URLs, so Next needs a base to resolve them against. There is no
// canonical production domain recorded in this repo, so this reads the env var first, then
// Vercel's own per-deployment host, and only falls back to localhost for `next dev`.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// opengraph-image.tsx fills in the image tags for both the Open Graph and Twitter cards on
// its own, so there is no image to name here.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Credit Risk Analytics",
  description,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Credit Risk Analytics",
    title: "Credit Risk Analytics",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Credit Risk Analytics",
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <SiteHeader />
          {children}
          <footer className="border-t border-zinc-100 px-6 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
            Model output, not a lending decision. Trained on historical LendingClub loans, so it
            only knows the kinds of borrowers that dataset contains.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
