"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth";

export default function Navigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="mb-6">
      <div className="flex justify-between items-center">
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

        {/* User info and sign out */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <div className="text-white/70">{user.profile.full_name || user.email}</div>
              <div className="text-xs text-white/50 capitalize">
                {user.profile.role.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
