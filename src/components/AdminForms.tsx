"use client";

import { useRef, useState, useTransition } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { DeleteButton } from "./DeleteButton";
import {
  addPenalty,
  createAccount,
  deleteAccount,
  deletePenalty,
  resetPassword,
  saveJudgeAssignments,
  setEntryStatus,
  setPublished,
  updateProfile,
} from "@/app/actions/admin";
import { ROLE_LABEL } from "@/lib/utils";
import type { ActionState, Role } from "@/lib/types";

export function PublishButton({ competitionId, published }: { competitionId: string; published: boolean }) {
  return (
    <ActionForm
      action={setPublished}
      confirm={
        published
          ? "Tarik kembali publikasi hasil lomba ini?"
          : "Publikasikan hasil lomba ini? Admin Desa dan halaman publik akan melihat peringkat."
      }
    >
      <input type="hidden" name="competition_id" value={competitionId} />
      <input type="hidden" name="publish" value={published ? "false" : "true"} />
      <SubmitButton className={`btn sm ${published ? "danger" : "green"}`} pendingText="…">
        {published ? "Tarik publikasi" : "Publikasikan hasil"}
      </SubmitButton>
    </ActionForm>
  );
}

export function StatusButton({ entryId, disqualified }: { entryId: string; disqualified: boolean }) {
  return (
    <ActionForm
      action={setEntryStatus}
      confirm={disqualified ? "Kembalikan pendaftaran ini?" : "Diskualifikasi pendaftaran ini? Nilainya tidak akan dihitung."}
    >
      <input type="hidden" name="id" value={entryId} />
      <input type="hidden" name="status" value={disqualified ? "registered" : "disqualified"} />
      <SubmitButton className={`btn sm ${disqualified ? "soft" : "danger"}`} pendingText="…">
        {disqualified ? "Kembalikan" : "Diskualifikasi"}
      </SubmitButton>
    </ActionForm>
  );
}

export function PenaltyForm({
  entryId,
  penalties,
  canEdit,
}: {
  entryId: string;
  penalties: { id: string; points: number; reason: string | null }[];
  /** Hanya Super Admin yang boleh menambah/menghapus pengurangan. */
  canEdit: boolean;
}) {
  return (
    <details>
      <summary>
        Pengurangan nilai{penalties.length ? ` (−${penalties.reduce((s, p) => s + Number(p.points), 0)})` : ""}
      </summary>
      <div style={{ marginTop: 8 }}>
        {penalties.map((p) => (
          <div key={p.id} className="row between small" style={{ marginBottom: 6 }}>
            <span>
              −{p.points} · {p.reason || "tanpa keterangan"}
            </span>
            {canEdit && (
              <ActionForm action={deletePenalty} confirm="Hapus pengurangan ini?">
                <input type="hidden" name="id" value={p.id} />
                <SubmitButton className="btn danger sm" pendingText="…">
                  Hapus
                </SubmitButton>
              </ActionForm>
            )}
          </div>
        ))}
        {!canEdit && penalties.length === 0 && <span className="muted small">Tidak ada pengurangan.</span>}
        {canEdit && <ActionForm action={addPenalty} resetOnSuccess>
          <input type="hidden" name="entry_id" value={entryId} />
          <div className="row">
            <input name="points" type="number" step="0.01" min="0.01" defaultValue={1} required style={{ width: 90 }} />
            <input name="reason" type="text" placeholder="Alasan (mis. disiplin mengganggu)" style={{ flex: 1, minWidth: 180 }} />
            <SubmitButton className="btn soft sm">Tambah</SubmitButton>
          </div>
        </ActionForm>}
      </div>
    </details>
  );
}

export function ProfileForm({
  profile,
  villages,
  isSelf,
  canAssignAdmin,
}: {
  profile: { id: string; full_name: string; email: string | null; role: Role; village_id: string | null };
  villages: { id: string; name: string }[];
  isSelf: boolean;
  /** Hanya Super Admin yang boleh memilih peran Super Admin / Admin Daerah. */
  canAssignAdmin: boolean;
}) {
  return (
    <ActionForm action={updateProfile}>
      <input type="hidden" name="id" value={profile.id} />
      <div className="fields">
        <div>
          <label>Email</label>
          <div style={{ padding: "10px 0" }}>{profile.email ?? "—"}</div>
        </div>
        <div>
          <label>Nama</label>
          <input name="full_name" type="text" defaultValue={profile.full_name} />
        </div>
        <div>
          <label>Peran</label>
          <select name="role" defaultValue={profile.role} disabled={isSelf}>
            {(Object.keys(ROLE_LABEL) as Role[])
              .filter((r) => canAssignAdmin || (r !== "super_admin" && r !== "regional_admin"))
              .map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
              ))}
          </select>
          {isSelf && <input type="hidden" name="role" value={profile.role} />}
        </div>
        <div>
          <label>Desa (untuk Admin Desa)</label>
          <select name="village_id" defaultValue={profile.village_id ?? ""}>
            <option value="">—</option>
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <SubmitButton className="btn soft">Simpan</SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}

export function JudgeAssignForm({
  judgeId,
  competitions,
  assigned,
}: {
  judgeId: string;
  competitions: { id: string; name: string }[];
  assigned: string[];
}) {
  const set = new Set(assigned);
  return (
    <ActionForm action={saveJudgeAssignments}>
      <input type="hidden" name="judge_id" value={judgeId} />
      <div className="checks">
        {competitions.map((c) => (
          <label key={c.id} className="check">
            <input type="checkbox" name="competition" value={c.id} defaultChecked={set.has(c.id)} />
            {c.name}
          </label>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <SubmitButton>Simpan penugasan</SubmitButton>
      </div>
    </ActionForm>
  );
}

const DEFAULT_PASSWORD = "kosong123";

type NewRole = "judge" | "village_admin" | "regional_admin";

export function CreateAccountDialog({
  villages,
  competitions,
  canCreateRegional,
}: {
  canCreateRegional: boolean;
  villages: { id: string; name: string }[];
  competitions: { id: string; name: string }[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<NewRole>("judge");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    dialog.current?.close();
    setError(null);
  }

  return (
    <>
      <div className="row between">
        <h2 style={{ margin: 0 }}>Akun</h2>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            setSuccess(null);
            dialog.current?.showModal();
          }}
        >
          + Buat Akun
        </button>
      </div>
      {success && <div className="alert ok">{success}</div>}

      <dialog ref={dialog} className="modal">
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const res: ActionState = await createAccount(fd);
              if (res.ok) {
                setSuccess(res.message ?? "Akun dibuat.");
                formRef.current?.reset();
                setRole("judge");
                close();
              } else setError(res.error ?? "Terjadi kesalahan.");
            });
          }}
        >
          <h2>Buat akun baru</h2>
          <div className="stack">
            <div>
              <label htmlFor="ca-role">Peran</label>
              <select
                id="ca-role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as NewRole)}
              >
                <option value="judge">Juri</option>
                <option value="village_admin">Admin Desa</option>
                {canCreateRegional && <option value="regional_admin">Admin Daerah</option>}
              </select>
            </div>
            {role === "village_admin" ? (
              <div>
                <label htmlFor="ca-village">Desa</label>
                <select id="ca-village" name="village_id" required defaultValue="">
                  <option value="" disabled>
                    Pilih desa…
                  </option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : role === "regional_admin" ? null : (
              <div>
                <label>Lomba yang dinilai</label>
                <div className="checks">
                  {competitions.map((c) => (
                    <label key={c.id} className="check">
                      <input type="checkbox" name="competition" value={c.id} />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label htmlFor="ca-name">Nama (opsional)</label>
              <input id="ca-name" name="full_name" type="text" placeholder="Kosongkan untuk nama otomatis" />
              <div className="muted small">
                Otomatis: Juri → &ldquo;Juri Lomba &lt;lomba pertama&gt;&rdquo;, Admin Desa →
                &ldquo;Admin Desa &lt;nama desa&gt;&rdquo;, Admin Daerah → &ldquo;Admin Daerah&rdquo;.
              </div>
            </div>
            <div>
              <label htmlFor="ca-email">Email</label>
              <input id="ca-email" name="email" type="email" required autoComplete="off" />
            </div>
            <div>
              <label htmlFor="ca-pass">Kata sandi</label>
              <input
                id="ca-pass"
                name="password"
                type="text"
                required
                minLength={6}
                defaultValue={DEFAULT_PASSWORD}
                autoComplete="off"
              />
            </div>
          </div>
          {error && <div className="alert err">{error}</div>}
          <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
            <button type="button" className="btn ghost" onClick={close} disabled={pending}>
              Batal
            </button>
            <button type="submit" className="btn primary" disabled={pending}>
              {pending ? "Membuat…" : "Buat akun"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function AccountActions({ profile, isSelf }: { profile: { id: string; role: Role }; isSelf: boolean }) {
  const canDelete = !isSelf && profile.role !== "super_admin";
  return (
    <div className="row between" style={{ marginTop: 10, alignItems: "flex-start" }}>
      <details>
        <summary>Ganti kata sandi</summary>
        <ActionForm action={resetPassword} resetOnSuccess>
          <input type="hidden" name="id" value={profile.id} />
          <div className="row" style={{ marginTop: 8 }}>
            <input name="password" type="text" required minLength={6} placeholder="Kata sandi baru" autoComplete="off" />
            <SubmitButton className="btn soft sm">Simpan</SubmitButton>
          </div>
        </ActionForm>
      </details>
      {canDelete && (
        <DeleteButton
          action={deleteAccount}
          id={profile.id}
          confirm="Hapus akun ini secara permanen? Tindakan tidak dapat dibatalkan."
          label="Hapus akun"
        />
      )}
    </div>
  );
}
