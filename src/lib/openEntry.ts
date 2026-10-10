import type { OpenField } from "./types";

/**
 * Pendaftaran lomba "open": dibuat dari nama (tanpa data peserta desa), dipakai untuk
 * Dakwah Online, Karya Tulis, Video Campaign, dan Mewarnai. Validasi ini dipakai di
 * form (client) dan server action, dan diulang di fungsi database `submit_open_entries`.
 */
export interface OpenComp {
  id: string;
  name: string;
  slug: string;
  form_fields: OpenField[];
  allow_team: boolean;
  deadline: string | null; // sudah diformat untuk ditampilkan
  deadlineIso: string | null; // batas pengiriman; setelah lewat pengiriman ditutup
  maxPerVillage: number | null; // kuota karya per desa (null = tanpa batas)
  note: string | null; // composition_note
}

export interface OpenRow {
  name: string;
  parent_name: string;
  ig_username: string;
  submission_url: string;
  entry_type: "individual" | "team";
  members_note: string;
}
export type OpenRowErrors = Partial<Record<keyof OpenRow, string>>;

export const MAX_OPEN_ROWS = 30;

/** Hanya Lomba Mewarnai yang boleh diisi banyak peserta sekaligus; lomba lain satu pendaftaran per kirim. */
export const allowsBulk = (c: { name: string }) => /mewarna/i.test(c.name);
export const BLANK_ROW: OpenRow = {
  name: "",
  parent_name: "",
  ig_username: "",
  submission_url: "",
  entry_type: "individual",
  members_note: "",
};

/** "@nama.akun" / " nama.akun " -> "nama.akun" */
export const normalizeIg = (v: string) => v.trim().replace(/^@+/, "");

const IG_RE = /^[A-Za-z0-9._]{1,30}$/;

function isHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateOpenRow(row: OpenRow, fields: OpenField[], allowTeam: boolean): OpenRowErrors {
  const e: OpenRowErrors = {};
  const team = allowTeam && row.entry_type === "team";
  const name = row.name.trim();

  if (!allowTeam && row.entry_type === "team") e.entry_type = "Lomba ini hanya untuk individu";

  if (!name) e.name = team ? "Nama tim wajib diisi" : "Nama peserta wajib diisi";
  else if (name.length > 100) e.name = "Maksimal 100 karakter";

  if (fields.includes("parent_name")) {
    const p = row.parent_name.trim();
    if (!p) e.parent_name = "Nama orang tua wajib diisi";
    else if (p.length < 2) e.parent_name = "Minimal 2 karakter";
    else if (p.length > 100) e.parent_name = "Maksimal 100 karakter";
  }

  if (fields.includes("ig_username")) {
    const ig = normalizeIg(row.ig_username);
    if (!ig) e.ig_username = "Username Instagram wajib diisi";
    else if (!IG_RE.test(ig)) e.ig_username = "Username tidak valid (huruf, angka, titik, garis bawah)";
  }

  if (fields.includes("submission_url")) {
    const u = row.submission_url.trim();
    if (!u) e.submission_url = "Link wajib diisi";
    else if (u.length > 500 || !isHttpUrl(u)) e.submission_url = "Masukkan link yang diawali https://";
  }

  if (team && row.members_note.trim().length > 500) e.members_note = "Maksimal 500 karakter";

  return e;
}

export const hasErrors = (e: OpenRowErrors) => Object.values(e).some(Boolean);

/** Bentuk baris yang dikirim ke server/database (bersih dari isian yang tidak relevan). */
export function toPayload(row: OpenRow, fields: OpenField[], allowTeam: boolean) {
  const team = allowTeam && row.entry_type === "team";
  return {
    name: row.name.trim(),
    parent_name: fields.includes("parent_name") ? row.parent_name.trim() : null,
    ig_username: fields.includes("ig_username") ? normalizeIg(row.ig_username) : null,
    submission_url: fields.includes("submission_url") ? row.submission_url.trim() : null,
    entry_type: team ? "team" : "individual",
    members_note: team ? row.members_note.trim() || null : null,
  };
}
