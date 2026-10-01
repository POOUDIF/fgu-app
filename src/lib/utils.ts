import type { Competition, Gender, Level, Participant } from "./types";

export const GENDER_LABEL: Record<Gender, string> = { L: "Putra", P: "Putri" };
export const LEVEL_LABEL: Record<Level, string> = {
  PAUD: "PAUD",
  TK: "TK",
  SD: "SD",
  SMP: "SMP",
  SMA: "SMA",
  PGM: "PGM",
};
export const LEVELS: Level[] = ["PAUD", "TK", "SD", "SMP", "SMA", "PGM"];
export const ROLE_LABEL = {
  super_admin: "Admin Daerah",
  village_admin: "Admin Desa",
  judge: "Juri",
} as const;

export function fmtScore(n: number | string | null | undefined, digits = 2) {
  if (n === null || n === undefined || n === "") return "—";
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return v.toLocaleString("id-ID", { maximumFractionDigits: digits });
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** ISO -> nilai input datetime-local (waktu Jakarta, UTC+7). */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 16);
}

/** Nilai input datetime-local (waktu Jakarta) -> ISO, atau null bila kosong. */
export function fromLocalInput(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return new Date(`${s}:00+07:00`).toISOString();
}

/** Pesan error database -> bahasa yang ramah. */
export function dbError(e: { message: string; code?: string } | null | undefined) {
  if (!e) return "Terjadi kesalahan.";
  const m = e.message ?? "";
  if (m.includes("entry_members_one_competition"))
    return "Peserta ini sudah terdaftar di lomba lain. Satu peserta hanya boleh ikut satu lomba.";
  if (m.includes("entries_one_per_slot"))
    return "Slot ini sudah terisi untuk desa Anda.";
  if (m.includes("row-level security"))
    return "Anda tidak memiliki izin untuk tindakan ini (atau pendaftaran sudah ditutup).";
  if (m.includes("duplicate key")) return "Data sudah ada.";
  if (m.includes("violates foreign key"))
    return "Data masih dipakai oleh data lain sehingga tidak dapat diubah/dihapus.";
  return m;
}

/** Apakah peserta memenuhi syarat dasar lomba (pre-filter; validasi akhir di database). */
export function isEligible(p: Participant, c: Competition) {
  if (c.levels && !c.levels.includes(p.education_level)) return false;
  if (c.max_age !== null && p.age > c.max_age) return false;
  if (c.allowed_genders && !c.allowed_genders.includes(p.gender)) return false;
  if (p.education_level === "SD" && (c.grade_min !== null || c.grade_max !== null)) {
    if (p.grade === null) return false;
    if (c.grade_min !== null && p.grade < c.grade_min) return false;
    if (c.grade_max !== null && p.grade > c.grade_max) return false;
  }
  return true;
}

export function registrationStatus(ev: {
  registration_opens_at: string | null;
  registration_closes_at: string | null;
} | null) {
  const now = Date.now();
  if (!ev) return { open: false, label: "Belum ada jadwal" };
  const o = ev.registration_opens_at ? new Date(ev.registration_opens_at).getTime() : null;
  const c = ev.registration_closes_at ? new Date(ev.registration_closes_at).getTime() : null;
  if (o !== null && now < o) return { open: false, label: `Dibuka ${fmtDateTime(ev.registration_opens_at)}` };
  if (c !== null && now > c) return { open: false, label: `Ditutup sejak ${fmtDateTime(ev.registration_closes_at)}` };
  return {
    open: true,
    label: c !== null ? `Dibuka sampai ${fmtDateTime(ev.registration_closes_at)}` : "Dibuka",
  };
}

/** True bila waktu sekarang masih sebelum (atau tepat pada) batas waktu. */
export function beforeDeadline(iso: string | null | undefined) {
  return !!iso && Date.now() <= new Date(iso).getTime();
}
