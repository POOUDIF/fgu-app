"use client";

import { useCallback, useRef } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { PhotoField } from "./PhotoField";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET, type ProcessedPhoto } from "@/lib/photo";
import { LEVELS } from "@/lib/utils";
import type { ActionState, Participant } from "@/lib/types";

export function ParticipantForm({
  action,
  initial,
  villageId,
  photoUrl,
  submitLabel,
  resetOnSuccess,
}: {
  action: (fd: FormData) => Promise<ActionState>;
  initial?: Participant;
  villageId: string;
  photoUrl?: string | null;
  submitLabel: string;
  resetOnSuccess?: boolean;
}) {
  const photo = useRef<ProcessedPhoto | null>(null);
  const busy = useRef(false);
  const newId = useRef<string | null>(null);
  const onPhoto = useCallback((p: ProcessedPhoto | null) => void (photo.current = p), []);
  const onBusy = useCallback((b: boolean) => void (busy.current = b), []);

  // Foto diunggah langsung dari browser ke Storage (batas 5 MB melebihi batas body server
  // action), lalu server action hanya menerima path-nya.
  async function submit(fd: FormData): Promise<ActionState> {
    if (busy.current) return { error: "Foto masih diproses, tunggu sebentar." };

    const id = initial?.id ?? (newId.current ??= crypto.randomUUID());
    if (!initial) fd.set("id", id);

    const p = photo.current;
    let path: string | null = null;
    if (p) {
      path = `${villageId}/${id}.${p.ext}`;
      const { error } = await createClient()
        .storage.from(PHOTO_BUCKET)
        .upload(path, p.blob, { contentType: p.type, upsert: true });
      if (error) return { error: `Foto gagal diunggah: ${error.message}` };
      fd.set("photo_path", path);
    }

    const res = await action(fd);
    if (path && !res.ok && path !== initial?.photo_path) {
      // Gagal tersimpan: jangan tinggalkan berkas yatim.
      await createClient().storage.from(PHOTO_BUCKET).remove([path]);
    }
    if (res.ok && !initial) newId.current = null;
    return res;
  }

  return (
    <ActionForm action={submit} resetOnSuccess={resetOnSuccess}>
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
        <PhotoField initialUrl={photoUrl} onChange={onPhoto} onBusyChange={onBusy} />
      </div>
      <div style={{ marginTop: 14 }}>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
