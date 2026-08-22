"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../lib/auth";
import { widthFor } from "../../lib/layout";
import BrandMark from "./BrandMark";
import Navigation from "./Navigation";

/** The routes that are the app itself, as opposed to the way in. Only these get the tabs. */
const APP_ROUTES = ["/score", "/dashboard"];

/**
 * The shared header: wordmark, the section tabs, and who you are signed in as.
 *
 * A client component because it reads the pathname to decide both the tabs and the page
 * width. The width matters: the header has to sit on the same left edge as the content under
 * it, and the dashboard is wider than everything else, so the two read from widthFor()
 * rather than each hardcoding a max-width that can drift.
 */
export default function SiteHeader() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const showTabs = APP_ROUTES.some((route) => pathname.startsWith(route));
  const width = widthFor(pathname);

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className={`${width} flex items-center gap-4 py-3`}>
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold tracking-tight"
        >
          <BrandMark />
          Credit Risk Analytics
        </Link>
        <div className="flex-1" />
        {user && (
          <div className="flex min-w-0 items-center gap-4">
            {/* A full name can be anything the person typed at sign-up, so it truncates and
                carries a title rather than pushing Sign out off the right edge. */}
            <span
              className="hidden min-w-0 max-w-[16rem] truncate text-sm text-zinc-500 sm:block"
              title={user.profile.full_name || user.email}
            >
              {user.profile.full_name || user.email}
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="shrink-0 whitespace-nowrap text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
      {showTabs && (
        <div className={`${width} flex items-center`}>
          <Navigation />
        </div>
      )}
    </header>
  );
}
