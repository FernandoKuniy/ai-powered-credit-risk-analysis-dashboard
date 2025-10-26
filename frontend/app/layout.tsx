import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "../lib/auth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        <AuthProvider>
          <div className="container py-8">
            <header className="mb-8">
              <Link href="/" className="block">
                <h1 className="text-2xl font-semibold hover:text-accent-400 transition-colors cursor-pointer">AI Credit Risk Analytics</h1>
              </Link>
              <p className="text-white/60">Score applications and explore portfolio risk.</p>
            </header>
            {children}
            <footer className="mt-10 text-xs text-white/40">© {new Date().getFullYear()} Fernando S. Kuniy</footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}