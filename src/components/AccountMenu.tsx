"use client";

import { useEffect, useRef, useState } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { changeOwnPassword } from "@/app/actions/auth";

export function AccountMenu({ name, roleLabel }: { name: string; roleLabel: string }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const firstName = name.split(" ")[0] || name;
  const initial = (name.trim()[0] || "?").toUpperCase();

  // Tutup dropdown saat klik di luar atau menekan Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openPasswordDialog() {
    setOpen(false);
    dialog.current?.showModal();
  }

  return (
    <div className="account-menu" ref={root}>
      <button
        type="button"
        className="account-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="account-avatar" aria-hidden>
          {initial}
        </span>
        <span className="account-name">{firstName}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
          <div className="account-dropdown" role="menu">
            <div className="account-dropdown-head">
              <b>{name}</b>
              <span>{roleLabel}</span>
            </div>
            <button type="button" className="account-item" role="menuitem" onClick={openPasswordDialog}>
              <span aria-hidden>🔑</span> Ganti kata sandi
            </button>
            <form action="/auth/signout" method="post">
              <button type="submit" className="account-item danger" role="menuitem">
                <span aria-hidden>↪</span> Keluar
              </button>
            </form>
          </div>
      )}

      <dialog ref={dialog} className="modal">
        <h2>Ganti kata sandi</h2>
        <p className="muted small">Berlaku untuk akun Anda sendiri ({name}).</p>
        <ActionForm action={changeOwnPassword} resetOnSuccess>
          <div className="field">
            <label htmlFor="am-pass">Kata sandi baru</label>
            <input id="am-pass" name="password" type="password" required minLength={6} autoComplete="new-password" />
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost" onClick={() => dialog.current?.close()}>
              Tutup
            </button>
            <SubmitButton className="btn primary">Simpan</SubmitButton>
          </div>
        </ActionForm>
      </dialog>
    </div>
  );
}
