import { isEligible } from "./utils";
import type { Gender, Level } from "./types";

/**
 * Ringkasan satu lomba (mode 'participant') beserta keterisiannya untuk satu desa.
 * Dipakai form peserta (client) untuk memfilter lomba sesuai kelas, dan server action
 * (dibangun ulang dari database) untuk memutuskan peserta masuk ke pendaftaran mana.
 */
export interface LombaOption {
  id: string;
  name: string;
  cluster: string | null;
  age_label: string;
  schedule_type: "hari_h" | "pre_event";
  levels: Level[] | null;
  grade_min: number | null;
  grade_max: number | null;
  allowed_genders: Gender[] | null;
  team_size: number | null;
  max_entries_per_village: number | null;
  slots: { id: string; gender: Gender | null; level: Level | null; taken: boolean }[];
  entries: number; // pendaftaran aktif desa ini
  composition_note: string | null;
  /** Regu wajib 1 putra + 1 putri (database menolak dua anggota sama gender). */
  mixedGender: boolean;
  /** Pendaftaran tim milik desa yang masih menerima anggota. */
  joinable: { id: string; slot_id: string | null; genders: Gender[] }[];
}

/**
 * Regu wajib 1 putra + 1 putri (Hafalan Doa Harian). Tidak ada kolom khusus untuk aturan ini,
 * jadi dideteksi dari nama lomba atau dari catatan komposisi (mis. "Wajib 1 putra dan 1 putri").
 */
export function requiresMixedGender(c: { name: string; composition_note: string | null }) {
  const note = c.composition_note ?? "";
  // Catatan "bebas: 1 putra 1 putri, 2 putra, atau 2 putri" (Dalil/Pegon) BUKAN aturan wajib.
  return (
    /doa harian/i.test(c.name) ||
    (/1\s*putra\s*(?:dan|&|\+)?\s*1\s*putri/i.test(note) && /wajib/i.test(note) && !/bebas/i.test(note))
  );
}

export interface PesertaKey {
  gender: Gender;
  education_level: Level;
  grade: number | null;
}

export type AttachPlan =
  | { kind: "join"; entryId: string }
  | { kind: "new"; slotId: string | null }
  | { kind: "none"; reason: string; eligible: boolean };

/** Batas anggota regu: min (null = tepat max) dan max (team_size). */
export function teamBounds(c: { team_size: number | null; team_min_size?: number | null }) {
  const max = c.team_size;
  const min = max === null ? null : Math.min(c.team_min_size ?? max, max);
  return { min, max };
}

/** Pesan bila jumlah anggota di luar batas; null bila sesuai. */
export function teamSizeError(c: { team_size: number | null; team_min_size?: number | null }, n: number) {
  const { min, max } = teamBounds(c);
  if (max === null || min === null) return null;
  if (n >= min && n <= max) return null;
  return min !== max
    ? `Lomba ini membutuhkan minimal ${min} dan maksimal ${max} anggota (Anda memilih ${n}).`
    : `Lomba ini membutuhkan tepat ${max} anggota (Anda memilih ${n}).`;
}

/** "tepat 10 anggota" / "minimal 5 dan maksimal 10 anggota" / "jumlah anggota bebas". */
export function teamRangeText(c: { team_size: number | null; team_min_size?: number | null }) {
  const { min, max } = teamBounds(c);
  if (max === null || min === null) return "jumlah anggota bebas";
  return min !== max ? `minimal ${min} dan maksimal ${max} anggota` : `tepat ${max} anggota`;
}

/** "terisi X dari Y" untuk desa yang login; null bila lomba tanpa kuota. */
export function quotaText(o: Pick<LombaOption, "slots" | "entries" | "max_entries_per_village">) {
  if (o.slots.length > 0) return `terisi ${o.slots.filter((s) => s.taken).length} dari ${o.slots.length}`;
  if (o.max_entries_per_village !== null) return `terisi ${o.entries} dari ${o.max_entries_per_village}`;
  return null;
}

const slotFits = (s: { gender: Gender | null; level: Level | null }, p: PesertaKey) =>
  (!s.gender || s.gender === p.gender) && (!s.level || s.level === p.education_level);

/** Tentukan cara memasukkan peserta ke lomba: gabung ke tim yang ada, atau buat pendaftaran baru. */
export function planAttach(o: LombaOption, p: PesertaKey): AttachPlan {
  if (!isEligible(p, o)) {
    return { kind: "none", eligible: false, reason: `Peserta tidak memenuhi syarat ${o.name}.` };
  }
  const join = o.joinable.find((e) => {
    if (o.mixedGender && e.genders.includes(p.gender)) return false; // butuh gender berlawanan
    if (!e.slot_id) return true;
    const slot = o.slots.find((s) => s.id === e.slot_id);
    return !slot || slotFits(slot, p);
  });
  if (join) return { kind: "join", entryId: join.id };
  if (o.mixedGender && o.joinable.length > 0) {
    return {
      kind: "none",
      eligible: true,
      reason: `Regu ${o.name} desa Anda membutuhkan peserta ${p.gender === "L" ? "putri" : "putra"} (wajib 1 putra dan 1 putri).`,
    };
  }

  if (o.slots.length > 0) {
    const free = o.slots.find((s) => !s.taken && slotFits(s, p));
    if (free) return { kind: "new", slotId: free.id };
    return { kind: "none", eligible: true, reason: `Kuota ${o.name} untuk desa Anda sudah terisi.` };
  }
  if (o.max_entries_per_village === null || o.entries < o.max_entries_per_village) {
    return { kind: "new", slotId: null };
  }
  return { kind: "none", eligible: true, reason: `Kuota ${o.name} untuk desa Anda sudah terisi.` };
}
