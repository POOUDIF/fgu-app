import { LEVELS } from "./utils";

/** Urutan = urutan field di form (dipakai untuk fokus ke error pertama). */
export const PARTICIPANT_FIELDS = [
  "full_name",
  "parent_name",
  "gender",
  "education_level",
  "grade",
  "age",
  "photo",
] as const;
export type ParticipantField = (typeof PARTICIPANT_FIELDS)[number];
export type ParticipantErrors = Partial<Record<ParticipantField, string>>;

/** Jenjang yang tidak memakai kolom Kelas. */
const NO_GRADE = ["PAUD", "TK", "PGM"];
export const usesGrade = (level: string) => !NO_GRADE.includes(level);
export const gradeRequired = (level: string) => level === "SD";

export interface ParticipantInput {
  full_name: string;
  parent_name: string;
  gender: string;
  education_level: string;
  grade: string; // string mentah dari form; "" = kosong
  age: string;
  hasPhoto: boolean;
}

/** Validasi yang sama dipakai di client (form) dan server (action). */
export function validateParticipant(i: ParticipantInput): ParticipantErrors {
  const e: ParticipantErrors = {};
  const name = i.full_name.trim();
  const parent = i.parent_name.trim();
  const grade = i.grade.trim();
  const age = i.age.trim();

  if (!name) e.full_name = "Nama lengkap wajib diisi";
  else if (name.length > 100) e.full_name = "Nama lengkap maksimal 100 karakter";

  if (!parent) e.parent_name = "Nama orang tua wajib diisi";
  else if (parent.length < 2) e.parent_name = "Nama orang tua minimal 2 karakter";
  else if (parent.length > 100) e.parent_name = "Nama orang tua maksimal 100 karakter";

  if (i.gender !== "L" && i.gender !== "P") e.gender = "Pilih jenis kelamin";

  if (!(LEVELS as string[]).includes(i.education_level)) e.education_level = "Pilih jenjang";

  if (usesGrade(i.education_level) && grade !== "") {
    const g = Number(grade);
    if (!Number.isInteger(g) || g < 1 || g > 12) e.grade = "Kelas harus 1–12";
  } else if (gradeRequired(i.education_level)) {
    e.grade = "Kelas wajib diisi untuk SD";
  }

  const a = Number(age);
  if (age === "" || !Number.isInteger(a) || a < 1 || a > 100) e.age = "Usia wajib diisi (1-100)";

  if (!i.hasPhoto) e.photo = "Foto wajib diunggah";

  return e;
}

export function firstError(e: ParticipantErrors) {
  const f = PARTICIPANT_FIELDS.find((k) => e[k]);
  return f ? { field: f, message: e[f]! } : null;
}

/** "{Nama} Bin/Binti {Ortu}" mengikuti jenis kelamin. */
export function binBinti(name: string, parent: string, gender: string) {
  const link = gender === "L" ? "Bin" : gender === "P" ? "Binti" : "Bin/Binti";
  return `${name.trim()} ${link} ${parent.trim()}`;
}
