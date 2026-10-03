"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Muat ulang data halaman (tanpa realtime, hemat kuota). */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn white sm" disabled={pending} onClick={() => start(() => router.refresh())}>
      {pending ? "Memuat…" : "↻ Muat ulang"}
    </button>
  );
}
