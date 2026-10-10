import type { Level } from "./types";

/**
 * Pendaftaran peserta berdasarkan KELAS. Satu pilihan kelas dipetakan ke
 * (education_level, grade) yang sudah ada di database:
 *   PAUD -> PAUD, TK -> TK, SD kelas 1-6, SMP kelas 1-3, SMA/K kelas 1-3, Remaja PGM -> PGM.
 */
export interface KelasOption {
  value: string;
  label: string;
  group: string;
  level: Level;
  grade: number | null;
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export const KELAS_OPTIONS: KelasOption[] = [
  { value: "PAUD", label: "PAUD", group: "PAUD & TK", level: "PAUD", grade: null },
  { value: "TK", label: "TK", group: "PAUD & TK", level: "TK", grade: null },
  ...range(6).map((g) => ({ value: `SD-${g}`, label: `SD kelas ${g}`, group: "SD", level: "SD" as Level, grade: g })),
  ...range(3).map((g) => ({ value: `SMP-${g}`, label: `SMP kelas ${g}`, group: "SMP", level: "SMP" as Level, grade: g })),
  ...range(3).map((g) => ({ value: `SMA-${g}`, label: `SMA/K kelas ${g}`, group: "SMA/K", level: "SMA" as Level, grade: g })),
  { value: "PGM", label: "Remaja PGM", group: "Remaja", level: "PGM", grade: null },
];

export const KELAS_GROUPS = [...new Set(KELAS_OPTIONS.map((k) => k.group))];

export function parseKelas(value: string) {
  return KELAS_OPTIONS.find((k) => k.value === value) ?? null;
}

/** Nilai kelas untuk data lama (SMP 7-9 / SMA 10-12 dinormalkan ke 1-3). "" bila tidak dikenali. */
export function kelasValue(level: string | null | undefined, grade: number | null | undefined) {
  if (!level) return "";
  if (level === "PAUD" || level === "TK" || level === "PGM") return level;
  if (grade == null) return "";
  let g = grade;
  if (level === "SMP" && g >= 7) g -= 6;
  if (level === "SMA" && g >= 10) g -= 9;
  const v = `${level}-${g}`;
  return parseKelas(v) ? v : "";
}

/** Teks tampilan: "SD kelas 3", "PAUD", "SMA/K kelas 1", "Remaja PGM". */
export function kelasLabel(level: string | null | undefined, grade: number | null | undefined) {
  const found = parseKelas(kelasValue(level, grade));
  if (found) return found.label;
  if (level === "SMA") return grade ? `SMA/K kelas ${grade}` : "SMA/K";
  if (level === "PGM") return "Remaja PGM";
  return `${level ?? "—"}${grade ? ` kelas ${grade}` : ""}`;
}

/** Urutan = urutan field di form (dipakai untuk fokus ke error pertama). */
export const PARTICIPANT_FIELDS = [
  "full_name",
  "parent_name",
  "gender",
  "kelas",
  "lomba_id",
  "photo",
] as const;
export type ParticipantField = (typeof PARTICIPANT_FIELDS)[number];
export type ParticipantErrors = Partial<Record<ParticipantField, string>>;

export interface ParticipantInput {
  full_name: string;
  parent_name: string;
  gender: string;
  kelas: string;
  lomba_id: string;
  needLomba: boolean; // true saat menambah peserta baru
  hasPhoto: boolean;
}

/** Validasi yang sama dipakai di client (form) dan server (action). */
export function validateParticipant(i: ParticipantInput): ParticipantErrors {
  const e: ParticipantErrors = {};
  const name = i.full_name.trim();
  const parent = i.parent_name.trim();

  if (!name) e.full_name = "Nama lengkap wajib diisi";
  else if (name.length > 100) e.full_name = "Nama lengkap maksimal 100 karakter";

  if (!parent) e.parent_name = "Nama orang tua wajib diisi";
  else if (parent.length < 2) e.parent_name = "Nama orang tua minimal 2 karakter";
  else if (parent.length > 100) e.parent_name = "Nama orang tua maksimal 100 karakter";

  if (i.gender !== "L" && i.gender !== "P") e.gender = "Pilih jenis kelamin";

  if (!parseKelas(i.kelas)) e.kelas = "Pilih kelas";

  if (i.needLomba && !i.lomba_id) e.lomba_id = "Pilih lomba yang diikuti";

  if (!i.hasPhoto) e.photo = "Foto wajib diunggah";

  return e;
}

export function firstError(e: ParticipantErrors) {
  const f = PARTICIPANT_FIELDS.find((k) => e[k]);
  return f ? { field: f, message: e[f]! } : null;
}

/** Nama untuk ditampilkan: display_name dari database (Nama Bin/Binti Ortu), jatuh ke nama lengkap. */
export function displayName(p: { display_name?: string | null; full_name: string }) {
  return p.display_name?.trim() || p.full_name;
}

/** "{Nama} Bin/Binti {Ortu}" mengikuti jenis kelamin. */
export function binBinti(name: string, parent: string, gender: string) {
  const link = gender === "L" ? "Bin" : gender === "P" ? "Binti" : "Bin/Binti";
  return `${name.trim()} ${link} ${parent.trim()}`;
}
