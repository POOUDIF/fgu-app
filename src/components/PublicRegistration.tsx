"use client";

import { useRef } from "react";
import { OpenEntryForm } from "./OpenEntryForm";
import { submitPublicEntries } from "@/app/actions/open";
import type { OpenComp } from "@/lib/openEntry";

/** Tombol + modal pendaftaran/pengumpulan karya publik (tanpa login). */
export function PublicRegistration({
  comps,
  villages,
  label = "Daftar & Kumpulkan Karya",
}: {
  comps: OpenComp[];
  villages: { id: string; name: string }[];
  label?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        className="btn white lg"
        style={{ color: "var(--blue2)" }}
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={dialog}
        className="modal wide"
        onClick={(e) => {
          // klik di area gelap (backdrop) menutup modal
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="modal-head">
          <h2>Pendaftaran &amp; Pengumpulan Karya Online</h2>
          <button type="button" className="modal-x" onClick={() => dialog.current?.close()} aria-label="Tutup">
            ✕
          </button>
        </div>
        <div className="alert info" style={{ marginTop: 0 }}>
          <b>📹 Tanpa login.</b> Pilih lomba, pilih desa, isi data peserta, lalu kirim (Lomba Mewarnai boleh banyak peserta sekaligus).
        </div>
        <OpenEntryForm
          comps={comps}
          villages={villages}
          action={submitPublicEntries}
          onCancel={() => dialog.current?.close()}
        />
      </dialog>
    </>
  );
}
