"use client";

import { useEffect, useState } from "react";
import { SideNav, type SideItem } from "./SideNav";

const STORAGE_KEY = "fgu-sidebar-collapsed";

/** Kerangka portal: menu di sisi kiri (bisa disembunyikan), isi halaman di kanan. */
export function PortalShell({
  badge,
  title,
  items,
  children,
}: {
  badge: string;
  title: string;
  items: SideItem[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) === "1";
      if (saved) {
        // Preferensi tersimpan baru bisa dibaca di client setelah mount (SSR tidak
        // tahu isi localStorage), jadi sinkronisasi sekali di sini sudah tepat.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsed(true);
      }
    } catch {
      // localStorage tidak tersedia (mode privat dsb.) — abaikan, biarkan tidak collapsed.
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // abaikan
      }
      return next;
    });
  }

  return (
    <div className={`portal${collapsed ? " collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-badge">{badge}</span>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggle}
            aria-label={collapsed ? "Tampilkan menu" : "Sembunyikan menu"}
            title={collapsed ? "Tampilkan menu" : "Sembunyikan menu"}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
        </div>
        <SideNav items={items} />
      </aside>
      <section className="portal-main">
        <h1>{title}</h1>
        {children}
      </section>
    </div>
  );
}
