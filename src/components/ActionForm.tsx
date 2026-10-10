"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import type { ActionState } from "@/lib/types";

const PendingCtx = createContext(false);

export function SubmitButton({
  children,
  className = "btn primary",
  pendingText = "Menyimpan…",
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const pending = useContext(PendingCtx);
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Form yang memanggil server action secara imperatif, sehingga isian TIDAK
 * ter-reset saat terjadi error (perilaku default <form action> di React 19).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
  noValidate,
}: {
  action: (fd: FormData) => Promise<ActionState | void>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  noValidate?: boolean;
}) {
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className={className}
      noValidate={noValidate}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = (await action(fd)) ?? { ok: true };
          setState(res);
          if (res.ok && resetOnSuccess) ref.current?.reset();
        });
      }}
    >
      <PendingCtx.Provider value={pending}>{children}</PendingCtx.Provider>
      {state.error && <div className="alert err">{state.error}</div>}
      {state.ok && state.message && <div className="alert ok">{state.message}</div>}
    </form>
  );
}
