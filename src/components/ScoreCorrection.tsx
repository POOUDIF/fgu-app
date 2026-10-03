"use client";

import { useRef, useState, useTransition } from "react";
import { editScore, resetJudgeEntry } from "@/app/actions/admin";
import type { ActionState } from "@/lib/types";

/** Dialog berisi isian + alasan wajib; memanggil server action lalu menutup. */
function CorrectionDialog({
  trigger,
  triggerClass,
  title,
  action,
  hidden,
  submitLabel,
  children,
}: {
  trigger: React.ReactNode;
  triggerClass: string;
  title: string;
  action: (fd: FormData) => Promise<ActionState>;
  hidden: Record<string, string>;
  submitLabel: string;
  children?: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function close() {
    dialog.current?.close();
    setError(null);
  }

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => dialog.current?.showModal()}>
        {trigger}
      </button>
      <dialog ref={dialog} className="modal">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await action(fd);
              if (res.ok) close();
              else setError(res.error ?? "Terjadi kesalahan.");
            });
          }}
        >
          <h2>{title}</h2>
          <div className="stack">
            {Object.entries(hidden).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            {children}
            <div>
              <label>Alasan (wajib)</label>
              <input name="reason" type="text" required maxLength={300} autoComplete="off" />
            </div>
          </div>
          {error && <div className="alert err">{error}</div>}
          <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost" onClick={close} disabled={pending}>
              Batal
            </button>
            <button type="submit" className="btn primary" disabled={pending}>
              {pending ? "Menyimpan…" : submitLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function ScoreEditButton({
  scoreId,
  score,
  max,
  label,
}: {
  scoreId: string;
  score: number;
  max: number;
  label: string;
}) {
  return (
    <CorrectionDialog
      trigger="✎"
      triggerClass="btn ghost sm"
      title={`Koreksi nilai: ${label}`}
      action={editScore}
      hidden={{ score_id: scoreId }}
      submitLabel="Simpan koreksi"
    >
      <div>
        <label>Nilai baru (0–{max})</label>
        <input name="new_score" type="number" step="0.01" min={0} max={max} defaultValue={score} required />
      </div>
    </CorrectionDialog>
  );
}

export function ResetJudgeButton({
  entryId,
  judgeId,
  judgeName,
}: {
  entryId: string;
  judgeId: string;
  judgeName: string;
}) {
  return (
    <CorrectionDialog
      trigger="Reset input"
      triggerClass="btn danger sm"
      title={`Reset input juri ${judgeName}`}
      action={resetJudgeEntry}
      hidden={{ entry_id: entryId, judge_id: judgeId }}
      submitLabel="Reset input juri"
    >
      <p className="muted small">
        Semua nilai juri ini untuk pendaftaran ini dihapus sehingga juri dapat menilai ulang.
      </p>
    </CorrectionDialog>
  );
}
