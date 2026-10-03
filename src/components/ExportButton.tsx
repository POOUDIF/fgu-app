"use client";

import { useState } from "react";

/** Tautan unduh Excel. Dinonaktifkan sebentar setelah diklik agar tidak terklik ganda. */
export function ExportButton({ href }: { href: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <a
      className="btn white"
      href={href}
      aria-disabled={busy}
      style={busy ? { opacity: 0.55, pointerEvents: "none" } : undefined}
      onClick={(e) => {
        if (busy) return e.preventDefault();
        setBusy(true);
        setTimeout(() => setBusy(false), 4000);
      }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
      </svg>
      {busy ? "Menyiapkan…" : "Export Excel"}
    </a>
  );
}
