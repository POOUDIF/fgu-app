"use client";

import { ActionForm, SubmitButton } from "./ActionForm";
import {
  addPenalty,
  deletePenalty,
  saveJudgeAssignments,
  setEntryStatus,
  setPublished,
  updateProfile,
} from "@/app/actions/admin";
import { ROLE_LABEL } from "@/lib/utils";
import type { Role } from "@/lib/types";

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
}: {
  entryId: string;
  penalties: { id: string; points: number; reason: string | null }[];
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
            <ActionForm action={deletePenalty} confirm="Hapus pengurangan ini?">
              <input type="hidden" name="id" value={p.id} />
              <SubmitButton className="btn danger sm" pendingText="…">
                Hapus
              </SubmitButton>
            </ActionForm>
          </div>
        ))}
        <ActionForm action={addPenalty} resetOnSuccess>
          <input type="hidden" name="entry_id" value={entryId} />
          <div className="row">
            <input name="points" type="number" step="0.01" min="0.01" defaultValue={1} required style={{ width: 90 }} />
            <input name="reason" type="text" placeholder="Alasan (mis. disiplin mengganggu)" style={{ flex: 1, minWidth: 180 }} />
            <SubmitButton className="btn soft sm">Tambah</SubmitButton>
          </div>
        </ActionForm>
      </div>
    </details>
  );
}

export function ProfileForm({
  profile,
  villages,
  isSelf,
}: {
  profile: { id: string; full_name: string; email: string | null; role: Role; village_id: string | null };
  villages: { id: string; name: string }[];
  isSelf: boolean;
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
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
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
