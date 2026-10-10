"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { createEntry } from "@/app/actions/desa";
import { displayName, kelasLabel } from "@/lib/participant";
import { teamBounds, teamSizeError } from "@/lib/lomba";
import { GENDER_LABEL } from "@/lib/utils";
import type { ActionState, Gender, Level } from "@/lib/types";

interface SlotOpt {
  id: string;
  label: string;
  gender: Gender | null;
  level: Level | null;
}
interface PartOpt {
  id: string;
  full_name: string;
  display_name?: string | null;
  gender: Gender;
  education_level: Level;
  grade: number | null;
  age: number | null;
  /** Nama lomba tempat peserta sudah terdaftar (satu peserta hanya boleh satu lomba). */
  takenIn?: string;
}

export function EntryForm({
  competitionId,
  slots,
  participants,
  teamSize,
  teamMinSize,
  isTeam,
  online,
  mixedGender,
  compositionNote,
}: {
  competitionId: string;
  slots: SlotOpt[]; // hanya slot yang masih kosong; kosong bila lomba tidak memakai slot
  participants: PartOpt[]; // sudah difilter sesuai syarat lomba (jenjang, kelas SD, gender)
  teamSize: number | null; // maksimal anggota
  teamMinSize: number | null; // minimal anggota (null = tepat teamSize)
  isTeam: boolean;
  online: boolean;
  /** Regu wajib 1 putra + 1 putri. */
  mixedGender: boolean;
  compositionNote: string | null;
}) {
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const slot = slots.find((s) => s.id === slotId) ?? null;

  // Lomba perorangan: satu pendaftaran = satu peserta (pilih lewat radio).
  const single = teamSize === 1 || (!isTeam && teamSize === null);
  const max = single ? 1 : teamSize;
  const { min } = teamBounds({ team_size: teamSize, team_min_size: teamMinSize });

  const pickedGenders = participants.filter((p) => picked.includes(p.id)).map((p) => p.gender);

  const visible = participants.filter((p) => {
    if (slot?.gender && slot.gender !== p.gender) return false;
    if (slot?.level && slot.level !== p.education_level) return false;
    // Wajib 1 putra + 1 putri: setelah satu gender dipilih, sembunyikan gender yang sama.
    if (mixedGender && !picked.includes(p.id) && pickedGenders.includes(p.gender)) return false;
    return true;
  });

  const toggle = (id: string, on: boolean) =>
    setPicked((cur) => (single ? (on ? [id] : []) : on ? [...cur, id] : cur.filter((x) => x !== id)));

  async function submit(fd: FormData): Promise<ActionState> {
    if (!single) {
      const err = teamSizeError({ team_size: teamSize, team_min_size: teamMinSize }, picked.length);
      if (err) return { error: err };
    }
    const res = await createEntry(fd);
    if (res.ok) setPicked([]);
    return res;
  }

  return (
    <ActionForm action={submit} resetOnSuccess>
      <input type="hidden" name="competition_id" value={competitionId} />

      {slots.length > 0 && (
        <div className="field">
          <label htmlFor="slot_id">Slot pendaftaran</label>
          <select
            id="slot_id"
            name="slot_id"
            required
            value={slotId}
            onChange={(e) => {
              setSlotId(e.target.value);
              setPicked([]);
            }}
          >
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {isTeam && (
        <div className="field">
          <label htmlFor="team_name">Nama regu/tim (opsional)</label>
          <input id="team_name" name="team_name" type="text" maxLength={80} />
        </div>
      )}

      {compositionNote && <div className="alert info small">📝 {compositionNote}</div>}
      {mixedGender && !compositionNote && <div className="alert info small">📝 Wajib 1 putra dan 1 putri.</div>}

      <div className="field">
        <label>
          {single
            ? "Pilih peserta"
            : max
              ? `Pilih anggota (${picked.length}/${max})`
              : `Pilih anggota (${picked.length} dipilih)`}
        </label>
        {!single && teamMinSize !== null && min !== null && (
          <p className="field-hint" style={{ marginTop: 0 }}>
            Minimal {min} anggota{max !== null && max !== min ? `, maksimal ${max}` : ""}.
          </p>
        )}
        {mixedGender && (
          <p className="field-hint" style={{ marginTop: 0 }}>
            Wajib 1 putra dan 1 putri
            {picked.length === 1 ? ` — pilih anggota ${pickedGenders[0] === "L" ? "putri" : "putra"} berikutnya.` : "."}
          </p>
        )}
        {visible.length === 0 ? (
          <div className="alert info">
            Belum ada peserta yang memenuhi syarat untuk pendaftaran ini. Tambahkan peserta di menu
            Peserta.
          </div>
        ) : (
          <div className="checks">
            {visible.map((p) => {
              const checked = picked.includes(p.id);
              const disabled = !!p.takenIn || (!checked && max !== null && !single && picked.length >= max);
              return (
                <label className="check" key={p.id} style={disabled ? { opacity: 0.55, cursor: "not-allowed" } : undefined}>
                  <input
                    type={single ? "radio" : "checkbox"}
                    name="member"
                    value={p.id}
                    required={single}
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => toggle(p.id, e.target.checked)}
                  />
                  <span>
                    {displayName(p)}
                    <span className="muted small">
                      {" "}
                      · {GENDER_LABEL[p.gender]} · {kelasLabel(p.education_level, p.grade)}
                      {p.age ? ` · ${p.age} th` : ""}
                    </span>
                    {p.takenIn && (
                      <span className="chip yellow" style={{ marginLeft: 6 }}>
                        sudah terdaftar di {p.takenIn}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {online && (
        <div className="field">
          <label htmlFor="submission_url">Tautan karya (Google Drive / media sosial)</label>
          <input id="submission_url" name="submission_url" type="url" placeholder="https://" />
          <div className="muted small">Boleh dikosongkan dulu dan diisi sebelum batas pengumpulan.</div>
        </div>
      )}

      <SubmitButton>Simpan pendaftaran</SubmitButton>
    </ActionForm>
  );
}
