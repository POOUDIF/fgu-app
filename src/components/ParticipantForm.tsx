"use client";

import { ActionForm, SubmitButton } from "./ActionForm";
import { LEVELS } from "@/lib/utils";
import type { ActionState, Participant } from "@/lib/types";

export function ParticipantForm({
  action,
  initial,
  submitLabel,
  resetOnSuccess,
}: {
  action: (fd: FormData) => Promise<ActionState>;
  initial?: Participant;
  submitLabel: string;
  resetOnSuccess?: boolean;
}) {
  return (
    <ActionForm action={action} resetOnSuccess={resetOnSuccess}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="fields">
        <div>
          <label htmlFor="full_name">Nama lengkap</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            maxLength={100}
            defaultValue={initial?.full_name}
          />
        </div>
        <div>
          <label htmlFor="gender">Jenis kelamin</label>
          <select id="gender" name="gender" required defaultValue={initial?.gender ?? ""}>
            <option value="" disabled>
              Pilih…
            </option>
            <option value="L">Putra</option>
            <option value="P">Putri</option>
          </select>
        </div>
        <div>
          <label htmlFor="education_level">Jenjang</label>
          <select
            id="education_level"
            name="education_level"
            required
            defaultValue={initial?.education_level ?? ""}
          >
            <option value="" disabled>
              Pilih…
            </option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="grade">Kelas (wajib untuk SD)</label>
          <input
            id="grade"
            name="grade"
            type="number"
            min={1}
            max={12}
            defaultValue={initial?.grade ?? ""}
          />
        </div>
        <div>
          <label htmlFor="age">Usia (tahun)</label>
          <input
            id="age"
            name="age"
            type="number"
            min={1}
            max={100}
            required
            defaultValue={initial?.age}
          />
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
