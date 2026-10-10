export type Role = "super_admin" | "regional_admin" | "village_admin" | "judge";
export type Gender = "L" | "P";
export type OpenField = "parent_name" | "ig_username" | "submission_url";
export type Level = "PAUD" | "TK" | "SD" | "SMP" | "SMA" | "PGM";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  village_id: string | null;
}

export interface Village {
  id: string;
  name: string;
  sort_order: number;
}

export interface Competition {
  id: string;
  slug: string;
  name: string;
  cluster: string | null;
  schedule_type: "hari_h" | "pre_event";
  age_label: string;
  levels: Level[] | null;
  grade_min: number | null;
  grade_max: number | null;
  max_age: number | null;
  allowed_genders: Gender[] | null;
  participation_type: "individual" | "team";
  /** Maksimal anggota regu. */
  team_size: number | null;
  /** Minimal anggota regu; null = harus tepat team_size. */
  team_min_size?: number | null;
  /** Catatan aturan komposisi regu/peserta (diisi panitia di database). */
  composition_note: string | null;
  max_entries_per_village: number | null;
  submission_mode: "offline" | "online";
  submission_deadline: string | null;
  venue: string | null;
  /** 'open' = didaftarkan lewat nama (tanpa data peserta); 'participant' = lewat data peserta desa. */
  registration_mode?: "participant" | "open";
  /** Isian tambahan form lomba 'open' (nama selalu ada). */
  form_fields?: OpenField[] | null;
  /** Lomba 'open' yang boleh didaftarkan sebagai Individu atau Tim (Video Campaign). */
  allow_team?: boolean;
  scoring_method: "weighted_criteria" | "points";
  winner_count: number;
  results_published: boolean;
  rules: string[];
  sort_order: number;
  is_active: boolean;
}

export interface Slot {
  id: string;
  competition_id: string;
  label: string;
  gender: Gender | null;
  level: Level | null;
  ranking_group: string | null;
  sort_order: number;
}

export interface Criterion {
  id: string;
  competition_id: string;
  group_name: string | null;
  name: string;
  weight: number;
  max_score: number;
  sort_order: number;
}

export interface Participant {
  id: string;
  village_id: string;
  full_name: string;
  /** "Nama Bin/Binti Orang Tua", dibuat otomatis oleh database. */
  display_name?: string | null;
  parent_name: string | null;
  gender: Gender;
  education_level: Level;
  grade: number | null;
  age: number | null;
  photo_path: string | null;
}

export interface EventRow {
  id: string;
  name: string;
  event_date: string | null;
  venue: string | null;
  theme: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
}

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}
