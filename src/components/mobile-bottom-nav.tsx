"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

type MobileBottomNavLink = {
  href: string;
  label: string;
};

type MobileBottomNavProps = {
  links: MobileBottomNavLink[];
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

export function MobileBottomNav({ links }: MobileBottomNavProps) {
  const pathname = usePathname();

  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const mobileLinks = links.slice(0, 4);

  return createPortal(
    <nav
      className="fixed inset-x-4 z-[90] md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
      aria-label="Bottom tab navigation"
    >
      <div className="relative overflow-hidden rounded-[1.8rem] border border-slate-300/20 bg-slate-950/70 p-2 shadow-[0_16px_28px_rgba(8,15,28,0.5)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(148,163,184,0.2),rgba(15,23,42,0.1))]" />
        <div className="relative grid grid-cols-4 gap-1.5">
          {mobileLinks.map((link) => {
            const isActive = isActivePath(pathname, link.href);
            return (
              <Link
                key={`mobile-${link.href}`}
                href={link.href}
                prefetch
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-[11px] font-semibold transition ${isActive
                  ? "-translate-y-1 bg-slate-700/70 text-cyan-100 shadow-[0_10px_20px_rgba(5,10,20,0.35)]"
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
    </nav>,
    document.body,
  );
}
