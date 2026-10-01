export type Role = "super_admin" | "village_admin" | "judge";
export type Gender = "L" | "P";
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
  team_size: number | null;
  composition_note: string | null;
  max_entries_per_village: number | null;
  submission_mode: "offline" | "online";
  submission_deadline: string | null;
  venue: string | null;
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
  gender: Gender;
  education_level: Level;
  grade: number | null;
  age: number;
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
