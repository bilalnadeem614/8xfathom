"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, Video } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/", label: "Action items", icon: ListChecks, match: (p: string) => p === "/" },
  { href: "/meetings", label: "Meetings", icon: Video, match: (p: string) => p.startsWith("/meetings") },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 items-center gap-1 border-b border-zinc-200 bg-zinc-100/60 px-3 py-2 md:sticky md:top-0 md:h-screen md:w-52 md:flex-col md:items-stretch md:border-r md:border-b-0 md:py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <Link href="/" className="mr-3 flex items-center gap-2 px-2 md:mr-0 md:mb-6">
        <span className="h-2 w-2 rounded-full bg-blue-600" />
        <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          notetaker
        </span>
      </Link>
      <nav className="flex gap-1 md:flex-col">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-700"
                  : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-blue-600 dark:text-blue-400" : ""}`} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto px-2 md:mt-auto md:ml-0">
        <ThemeToggle />
      </div>
    </aside>
  );
}
