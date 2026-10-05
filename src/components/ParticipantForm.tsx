"use client";

import { useCallback, useRef, useState } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { PhotoField } from "./PhotoField";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET, type ProcessedPhoto } from "@/lib/photo";
import {
  binBinti,
  firstError,
  gradeRequired,
  usesGrade,
  validateParticipant,
  type ParticipantErrors,
  type ParticipantField,
} from "@/lib/participant";
import { LEVELS } from "@/lib/utils";
import type { ActionState, Participant } from "@/lib/types";

const BLANK = { full_name: "", parent_name: "", gender: "", education_level: "", grade: "", age: "" };

function Label({ htmlFor, required, children }: { htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor}>
      {children}
      {required && <span className="req" aria-hidden="true"> *</span>}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="field-err" role="alert">
      {message}
    </p>
  ) : null;
}

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
  const [v, setV] = useState(
    initial
      ? {
          full_name: initial.full_name,
          parent_name: initial.parent_name ?? "",
          gender: initial.gender as string,
          education_level: initial.education_level as string,
          grade: initial.grade?.toString() ?? "",
          age: initial.age.toString(),
        }
      : BLANK,
  );
  const [errors, setErrors] = useState<ParticipantErrors>({});
  const photo = useRef<ProcessedPhoto | null>(null);
  const busy = useRef(false);
  const newId = useRef<string | null>(null);
  const onPhoto = useCallback((p: ProcessedPhoto | null) => void (photo.current = p), []);
  const onBusy = useCallback((b: boolean) => void (busy.current = b), []);

  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setV((cur) => ({ ...cur, [k]: value }));
    // Hapus pesan error field ini begitu pengguna memperbaikinya.
    setErrors((cur) => (cur[k as ParticipantField] ? { ...cur, [k]: undefined } : cur));
  };

  const showGrade = v.education_level === "" || usesGrade(v.education_level);
  const needGrade = gradeRequired(v.education_level);

  const props = (f: ParticipantField) => ({
    id: f,
    "aria-invalid": !!errors[f],
    "aria-describedby": errors[f] ? `${f}-error` : f === "parent_name" ? "parent_name-hint" : undefined,
  });

  // Foto diunggah langsung dari browser ke Storage (batas 5 MB melebihi batas body server
  // action), lalu server action hanya menerima path-nya.
  async function submit(fd: FormData): Promise<ActionState> {
    const found = validateParticipant({ ...v, hasPhoto: !!photo.current || !!initial?.photo_path });
    setErrors(found);
    const first = firstError(found);
    if (first) {
      document.getElementById(first.field)?.focus();
      return {};
    }
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
    if (res.ok && !initial) {
      newId.current = null;
      if (resetOnSuccess) setV(BLANK);
    }
    return res;
  }

  return (
    <ActionForm action={submit} resetOnSuccess={resetOnSuccess} noValidate>
      <p className="req-note">
        <span className="req">*</span> wajib diisi
      </p>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="fields" style={{ alignItems: "start" }}>
        <div>
          <Label htmlFor="full_name" required>
            Nama lengkap
          </Label>
          <input
            {...props("full_name")}
            name="full_name"
            type="text"
            required
            aria-required="true"
            maxLength={100}
            value={v.full_name}
            onChange={set("full_name")}
          />
          <FieldError id="full_name-error" message={errors.full_name} />
        </div>
        <div>
          <Label htmlFor="parent_name" required>
            Nama orang tua (ayah)
          </Label>
          <input
            {...props("parent_name")}
            name="parent_name"
            type="text"
            required
            aria-required="true"
            minLength={2}
            maxLength={100}
            value={v.parent_name}
            onChange={set("parent_name")}
          />
          <p id="parent_name-hint" className="field-hint">
            Tulis nama ayah saja, tanpa kata Bin/Binti
          </p>
          <FieldError id="parent_name-error" message={errors.parent_name} />
          {v.full_name.trim() && v.parent_name.trim() && (
            <p className="field-hint" aria-live="polite">
              Tertulis: <b>{binBinti(v.full_name, v.parent_name, v.gender)}</b>
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="gender" required>
            Jenis kelamin
          </Label>
          <select
            {...props("gender")}
            name="gender"
            required
            aria-required="true"
            value={v.gender}
            onChange={set("gender")}
          >
            <option value="">Pilih…</option>
            <option value="L">Putra</option>
            <option value="P">Putri</option>
          </select>
          <FieldError id="gender-error" message={errors.gender} />
        </div>
        <div>
          <Label htmlFor="education_level" required>
            Jenjang
          </Label>
          <select
            {...props("education_level")}
            name="education_level"
            required
            aria-required="true"
            value={v.education_level}
            onChange={(e) => {
              set("education_level")(e);
              if (!usesGrade(e.target.value)) {
                setV((cur) => ({ ...cur, grade: "" }));
                setErrors((cur) => ({ ...cur, grade: undefined }));
              }
            }}
          >
            <option value="">Pilih…</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <FieldError id="education_level-error" message={errors.education_level} />
        </div>
        {showGrade && (
          <div>
            <Label htmlFor="grade" required={needGrade}>
              Kelas
            </Label>
            <input
              {...props("grade")}
              name="grade"
              type="number"
              min={1}
              max={12}
              required={needGrade}
              aria-required={needGrade}
              value={v.grade}
              onChange={set("grade")}
            />
            <FieldError id="grade-error" message={errors.grade} />
          </div>
        )}
        <div>
          <Label htmlFor="age" required>
            Usia (tahun)
          </Label>
          <input
            {...props("age")}
            name="age"
            type="number"
            min={1}
            max={100}
            required
            aria-required="true"
            value={v.age}
            onChange={set("age")}
          />
          <FieldError id="age-error" message={errors.age} />
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <PhotoField
          initialUrl={photoUrl}
          required={!initial?.photo_path}
          error={errors.photo}
          onChange={(p) => {
            onPhoto(p);
            if (p) setErrors((cur) => ({ ...cur, photo: undefined }));
          }}
          onBusyChange={onBusy}
        />
      </div>
      <div style={{ marginTop: 14 }}>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
