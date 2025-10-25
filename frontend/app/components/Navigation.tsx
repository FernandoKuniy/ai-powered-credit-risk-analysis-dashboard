"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="mb-6">
      <div className="flex gap-2">
        <Link 
          href="/score" 
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            pathname === '/score' 
              ? 'bg-accent-500 text-white' 
              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
          }`}
        >
          Score Application
        </Link>
        <Link 
          href="/dashboard" 
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            pathname === '/dashboard' 
              ? 'bg-accent-500 text-white' 
              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
          }`}
        >
          Portfolio Dashboard
        </Link>
      </div>
    </nav>
  );
}
