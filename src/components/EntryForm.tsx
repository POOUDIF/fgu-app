"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { createEntry } from "@/app/actions/desa";
import { GENDER_LABEL } from "@/lib/utils";
import type { Gender, Level } from "@/lib/types";

interface SlotOpt {
  id: string;
  label: string;
  gender: Gender | null;
  level: Level | null;
}
interface PartOpt {
  id: string;
  full_name: string;
  gender: Gender;
  education_level: Level;
  grade: number | null;
  age: number;
}

export function EntryForm({
  competitionId,
  slots,
  participants,
  teamSize,
  isTeam,
  online,
}: {
  competitionId: string;
  slots: SlotOpt[]; // hanya slot yang masih kosong
  participants: PartOpt[]; // sudah difilter sesuai syarat lomba & belum terdaftar
  teamSize: number | null;
  isTeam: boolean;
  online: boolean;
}) {
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [count, setCount] = useState(0);
  const slot = slots.find((s) => s.id === slotId) ?? null;

  const visible = participants.filter(
    (p) =>
      (!slot?.gender || slot.gender === p.gender) &&
      (!slot?.level || slot.level === p.education_level),
  );
  const single = teamSize === 1;

  return (
    <ActionForm action={createEntry} resetOnSuccess>
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
              setCount(0);
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

      <div className="field">
        <label>
          {single
            ? "Pilih peserta"
            : teamSize
              ? `Pilih anggota (${count}/${teamSize})`
              : `Pilih anggota (${count} dipilih)`}
        </label>
        {visible.length === 0 ? (
          <div className="alert info">
            Belum ada peserta yang memenuhi syarat untuk pendaftaran ini. Tambahkan peserta di menu
            Peserta.
          </div>
        ) : (
          <div
            className="checks"
            onChange={(e) => {
              const root = e.currentTarget;
              setCount(root.querySelectorAll("input:checked").length);
            }}
          >
            {visible.map((p) => (
              <label className="check" key={p.id}>
                <input
                  type={single ? "radio" : "checkbox"}
                  name="member"
                  value={p.id}
                  required={single}
                />
                <span>
                  {p.full_name}
                  <span className="muted small">
                    {" "}
                    · {GENDER_LABEL[p.gender]} · {p.education_level}
                    {p.grade ? ` kls ${p.grade}` : ""} · {p.age} th
                  </span>
                </span>
              </label>
            ))}
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
