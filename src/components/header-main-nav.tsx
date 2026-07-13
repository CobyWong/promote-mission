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
  const mobileLinks = links.slice(0, 4);

  const activeClass = theme === "dark"
    ? "border-amber-300/60 bg-amber-300/15 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
    : "border-amber-300/60 bg-amber-300/15 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";

  const inactiveClass = theme === "dark"
    ? "border-transparent text-slate-300 hover:border-slate-500/70 hover:bg-white/5 hover:text-white"
    : "border-transparent text-slate-300 hover:border-slate-500/70 hover:bg-white/5 hover:text-white";

  return (
    <>
      <nav className={`hidden items-center border p-1 text-sm md:flex ${theme === "dark" ? "border-slate-400/60 bg-slate-800/45" : "border-slate-400/60 bg-slate-800/45"}`} style={{ borderRadius: "0.9rem", clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" }}>
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

      <nav
        className="fixed inset-x-3 z-[70] md:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        aria-label="Bottom tab navigation"
      >
        <div className="relative overflow-hidden rounded-[1.85rem] border border-cyan-200/20 bg-slate-900/62 p-2 shadow-[0_18px_45px_rgba(2,6,23,0.58)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(148,163,184,0.22),rgba(15,23,42,0.08))]" />
          <div className="relative grid grid-cols-4 gap-1">
            {mobileLinks.map((link) => {
              const isActive = isActivePath(pathname, link.href);
              return (
                <Link
                  key={`mobile-${link.href}`}
                  href={link.href}
                  prefetch
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${isActive
                    ? "bg-slate-700/65 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.26),0_8px_20px_rgba(2,6,23,0.35)]"
                    : "text-slate-300 hover:bg-white/10 hover:text-slate-100"
                    }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="text-base">
                    <NavIcon href={link.href} />
                  </span>
                  <span className="line-clamp-1 leading-none">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
