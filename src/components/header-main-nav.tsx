"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Theme } from "@/lib/theme";

type NavLink = {
  href: string;
  label: string;
};

type HeaderMainNavProps = {
  links: NavLink[];
  theme: Theme;
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(`${href}/`);
}

export function HeaderMainNav({ links, theme }: HeaderMainNavProps) {
  const pathname = usePathname();

  const activeClass = theme === "dark"
    ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200"
    : "border-blue-300 bg-blue-50 text-blue-700";

  const inactiveClass = theme === "dark"
    ? "border-transparent text-slate-300 hover:text-white"
    : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  return (
    <nav className="hidden items-center gap-3 text-sm md:flex">
      {links.map((link) => {
        const isActive = isActivePath(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            className={`rounded-full border px-4 py-2 font-semibold transition ${isActive ? activeClass : inactiveClass}`}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
