"use client";

import { useCallback, useRef, useState } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { PhotoField } from "./PhotoField";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET, type ProcessedPhoto } from "@/lib/photo";
import {
  binBinti,
  firstError,
  KELAS_GROUPS,
  KELAS_OPTIONS,
  kelasValue,
  parseKelas,
  validateParticipant,
  type ParticipantErrors,
  type ParticipantField,
} from "@/lib/participant";
import { planAttach, quotaText, type LombaOption } from "@/lib/lomba";
import type { ActionState, Gender, Participant } from "@/lib/types";

const BLANK = { full_name: "", parent_name: "", gender: "", kelas: "", lomba_id: "" };

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
  lombaOptions,
  currentLomba,
}: {
  action: (fd: FormData) => Promise<ActionState>;
  initial?: Participant;
  villageId: string;
  photoUrl?: string | null;
  submitLabel: string;
  resetOnSuccess?: boolean;
  /** Hanya saat menambah peserta baru: lomba yang bisa dipilih (disaring sesuai kelas). */
  lombaOptions?: LombaOption[];
  /** Hanya saat mengubah: lomba tempat peserta terdaftar saat ini (bisa diganti/dilepas). */
  currentLomba?: { id: string; name: string } | null;
}) {
  const [v, setV] = useState(
    initial
      ? {
          full_name: initial.full_name,
          parent_name: initial.parent_name ?? "",
          gender: initial.gender as string,
          kelas: kelasValue(initial.education_level, initial.grade),
          lomba_id: currentLomba?.id ?? "",
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

  const needLomba = !initial;
  const kelas = parseKelas(v.kelas);
  const lombaChoices = (lombaOptions ?? []).flatMap((o) => {
    if (!kelas || (v.gender !== "L" && v.gender !== "P")) return [];
    if (o.id === currentLomba?.id) return []; // lomba saat ini ditampilkan terpisah
    const plan = planAttach(o, { gender: v.gender as Gender, education_level: kelas.level, grade: kelas.grade });
    if (plan.kind === "none" && !plan.eligible) return [];
    return [{ o, full: plan.kind === "none", reason: plan.kind === "none" ? plan.reason : "" }];
  });

  const chosenLomba = (lombaOptions ?? []).find((o) => o.id === v.lomba_id);

  // Ganti kelas/jenis kelamin: kosongkan pilihan lomba bila tidak lagi sesuai.
  const resetLombaIfInvalid = (next: { gender: string; kelas: string }) =>
    setV((cur) => {
      const k = parseKelas(next.kelas);
      if (initial || !cur.lomba_id) return cur; // saat mengubah, pilihan lomba tidak dikosongkan otomatis
      const o = (lombaOptions ?? []).find((x) => x.id === cur.lomba_id);
      const ok =
        !!o &&
        !!k &&
        (next.gender === "L" || next.gender === "P") &&
        planAttach(o, { gender: next.gender as Gender, education_level: k.level, grade: k.grade }).kind !== "none";
      return ok ? cur : { ...cur, lomba_id: "" };
    });

  const props = (f: ParticipantField) => ({
    id: f,
    "aria-invalid": !!errors[f],
    "aria-describedby": errors[f] ? `${f}-error` : f === "parent_name" ? "parent_name-hint" : undefined,
  });

  // Foto diunggah langsung dari browser ke Storage (batas 5 MB melebihi batas body server
  // action), lalu server action hanya menerima path-nya.
  async function submit(fd: FormData): Promise<ActionState> {
    const found = validateParticipant({
      ...v,
      needLomba,
      hasPhoto: !!photo.current || !!initial?.photo_path,
    });
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
            onChange={(e) => {
              set("gender")(e);
              resetLombaIfInvalid({ gender: e.target.value, kelas: v.kelas });
            }}
          >
            <option value="">Pilih…</option>
            <option value="L">Putra</option>
            <option value="P">Putri</option>
          </select>
          <FieldError id="gender-error" message={errors.gender} />
        </div>
        <div>
          <Label htmlFor="kelas" required>
            Kelas
          </Label>
          <select
            {...props("kelas")}
            name="kelas"
            required
            aria-required="true"
            value={v.kelas}
            onChange={(e) => {
              set("kelas")(e);
              resetLombaIfInvalid({ gender: v.gender, kelas: e.target.value });
            }}
          >
            <option value="">Pilih…</option>
            {KELAS_GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {KELAS_OPTIONS.filter((k) => k.group === g).map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <FieldError id="kelas-error" message={errors.kelas} />
        </div>
      </div>
      {(needLomba || !!lombaOptions) && (
        <div style={{ marginTop: 14 }}>
          <Label htmlFor="lomba_id" required={needLomba}>
            Lomba yang diikuti
          </Label>
          <select
            {...props("lomba_id")}
            name="lomba_id"
            required={needLomba}
            aria-required={needLomba}
            value={v.lomba_id}
            disabled={lombaChoices.length === 0 && !currentLomba}
            onChange={set("lomba_id")}
          >
            {/* Peserta yang sudah terdaftar tidak bisa dilepas per orang; hanya bisa dipindah ke lomba lain. */}
            {!(initial && currentLomba) && (
              <option value="">
                {initial
                  ? "Belum terdaftar — pilih bila ingin mendaftarkan"
                  : !kelas || !v.gender
                    ? "Pilih jenis kelamin dan kelas terlebih dahulu"
                    : lombaChoices.length === 0
                      ? "Belum ada lomba untuk kelas ini"
                      : "Pilih lomba…"}
              </option>
            )}
            {currentLomba && (
              <option value={currentLomba.id}>{currentLomba.name} (saat ini)</option>
            )}
            {[...new Set(lombaChoices.map(({ o }) => o.cluster ?? "Lomba"))].map((cluster) => (
              <optgroup key={cluster} label={cluster}>
                {lombaChoices
                  .filter(({ o }) => (o.cluster ?? "Lomba") === cluster)
                  .map(({ o, full, reason }) => {
                    const q = quotaText(o);
                    return (
                      <option key={o.id} value={o.id} disabled={full}>
                        {o.name} — {o.age_label}
                        {q ? ` (${q})` : ""}
                        {full ? (reason.startsWith("Kuota") ? " · kuota desa penuh" : " · butuh peserta lawan jenis") : ""}
                      </option>
                    );
                  })}
              </optgroup>
            ))}
          </select>
          {chosenLomba?.composition_note && <p className="field-hint">📝 {chosenLomba.composition_note}</p>}
          {initial && (
            <p className="field-hint">
              Mengganti lomba akan memindahkan peserta dari lomba lama ke lomba yang dipilih.
            </p>
          )}
          <p className="field-hint">
            Daftar lomba menyesuaikan kelas dan jenis kelamin peserta. Dakwah Online, Mewarnai, Karya Tulis, dan
            Video Campaign didaftarkan lewat section <b>Pengumpulan Karya</b> di beranda.
          </p>
          <FieldError id="lomba_id-error" message={errors.lomba_id} />
        </div>
      )}
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
