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

function NavIcon({ href }: { href: string }) {
  if (href.startsWith("/missions")) {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M8.2 5.4a3 3 0 0 1 4.2 0l1.1 1.1a3 3 0 0 1 0 4.2l-1.1 1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M11.8 14.6a3 3 0 0 1-4.2 0l-1.1-1.1a3 3 0 0 1 0-4.2l1.1-1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (href.startsWith("/rewards")) {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M3.5 6.5h13v7h-13z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 9.5h13" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6.5" cy="13" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  if (href.startsWith("/leaderboard")) {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M5 16h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 6h6v6a3 3 0 0 1-6 0z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (href.startsWith("/dashboard")) {
    return (
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 16a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M4.5 4.5h11v11h-11z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function isActivePath(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(`${href}/`);
}

export function HeaderMainNav({ links, theme }: HeaderMainNavProps) {
  const pathname = usePathname();

  const activeClass = "border-cyan-500/35 bg-cyan-500/12 text-cyan-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]";

  const inactiveClass = "border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900";

  return (
    <nav className="hidden items-center border border-slate-300 bg-slate-100/90 p-1 text-sm md:flex" style={{ borderRadius: "0.9rem", clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" }}>
      {links.map((link) => {
        const isActive = isActivePath(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            className={`flex items-center gap-2 border px-4 py-2 font-semibold tracking-wide transition ${isActive ? activeClass : inactiveClass}`}
            style={{ borderRadius: "0.75rem", clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)" }}
            aria-current={isActive ? "page" : undefined}
          >
            <NavIcon href={link.href} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
