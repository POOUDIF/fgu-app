"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type MenuLink = { href: string; label: string; icon: "home" | "info" | "trophy" | "upload" | "grid" };

const ICONS: Record<MenuLink["icon"], React.ReactNode> = {
  home: <path d="m3 11 9-8 9 8M5 10v10h14V10" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  trophy: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
};

export function MobileMenu({ links }: { links: MenuLink[] }) {
  const [open, setOpen] = useState(false);

  // Kunci scroll halaman & tutup dengan Escape selama drawer terbuka.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="mobile-menu">
      <button
        type="button"
        className="burger"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
        aria-expanded={open}
        aria-controls="mobile-drawer"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>

      <div className={`drawer-backdrop${open ? " open" : ""}`} onClick={() => setOpen(false)} aria-hidden />
      <aside id="mobile-drawer" className={`drawer${open ? " open" : ""}`} aria-hidden={!open} inert={!open}>
        <div className="drawer-head">
          <span>Menu</span>
          <button type="button" className="burger" onClick={() => setOpen(false)} aria-label="Tutup menu">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav className="drawer-links">
          {links.map((l) => (
            <Link key={l.href + l.label} href={l.href} onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {ICONS[l.icon]}
              </svg>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="drawer-foot">Festival Generasi Unggul 3.0 · Bekasi Barat 2026</div>
      </aside>
    </div>
  );
}
