import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        <div className="container py-8">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold">AI Credit Risk Analytics</h1>
            <p className="text-white/60">Score applications and explore portfolio risk.</p>
          </header>
          {children}
          <footer className="mt-10 text-xs text-white/40">© {new Date().getFullYear()} Fernando S. Kuniy</footer>
        </div>
      </body>
    </html>
  );
}