"use client";

import { ActionForm, SubmitButton } from "./ActionForm";
import type { ActionState } from "@/lib/types";

/** Tombol hapus kecil dengan konfirmasi. `extra` = field hidden tambahan. */
export function DeleteButton({
  action,
  id,
  confirm,
  label = "Hapus",
}: {
  action: (fd: FormData) => Promise<ActionState>;
  id: string;
  confirm: string;
  label?: string;
}) {
  return (
    <ActionForm action={action} confirm={confirm}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="btn danger sm" pendingText="…">
        {label}
      </SubmitButton>
    </ActionForm>
  );
}
