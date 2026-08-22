"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The two things this app does: score one application, or look at the ones you have kept.
 *
 * Two destinations, not a sidebar of twelve. The account controls used to live in here too;
 * they moved to SiteHeader, because signing out is chrome that belongs to the whole app
 * rather than a third peer of these tabs.
 */
const TABS = [
  { href: "/score", label: "Score an application" },
  { href: "/dashboard", label: "Your portfolio" },
] as const;

export default function Navigation() {
  const pathname = usePathname();

  return (
    // `min-w-0` lets the nav shrink inside the header row, and the overflow is the safety
    // valve: on a narrow phone the tabs scroll rather than wrapping onto a second line.
    <nav aria-label="Sections" className="flex min-w-0 gap-5 overflow-x-auto">
      {TABS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-2.5 text-sm transition-colors ${
              active
                ? "border-zinc-900 font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
