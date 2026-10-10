"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCtx } from "@/lib/auth";
import { createAnonClient } from "@/lib/supabase/anon";
import { dbError } from "@/lib/utils";
import { allowsBulk, hasErrors, MAX_OPEN_ROWS, toPayload, validateOpenRow, type OpenRow } from "@/lib/openEntry";
import type { ActionState, Competition } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pembatas laju sederhana per instance server (mencegah klik beruntun / spam ringan).
// Pelindung sebenarnya untuk spam publik adalah captcha — lihat docs/PERUBAHAN_SUPABASE.md.
const WINDOW_MS = 10 * 60_000;
const MAX_SUBMITS = 8;
const hits = new Map<string, number[]>();

function tooFast(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_SUBMITS) return true;
  hits.set(key, [...recent, now]);
  if (hits.size > 500) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  return false;
}

function parseRows(fd: FormData): OpenRow[] | null {
  try {
    const rows = JSON.parse(String(fd.get("rows") ?? "[]"));
    return Array.isArray(rows) ? (rows as OpenRow[]) : null;
  } catch {
    return null;
  }
}

async function submit(supabase: SupabaseClient, fd: FormData, villageId: string | null): Promise<ActionState> {
  const competitionId = String(fd.get("competition_id") ?? "");
  if (!UUID.test(competitionId)) return { error: "Pilih lomba terlebih dahulu." };
  if (villageId !== null && !UUID.test(villageId)) return { error: "Pilih desa terlebih dahulu." };

  const rows = parseRows(fd);
  if (!rows || rows.length === 0) return { error: "Isi minimal 1 peserta." };
  if (rows.length > MAX_OPEN_ROWS) return { error: `Maksimal ${MAX_OPEN_ROWS} peserta sekali kirim.` };

  const { data } = await supabase
    .from("competitions")
    .select("id,name,slug,registration_mode,form_fields,allow_team,is_active")
    .eq("id", competitionId)
    .maybeSingle();
  const comp = data as Pick<Competition, "id" | "name" | "registration_mode" | "form_fields" | "allow_team" | "is_active"> | null;
  if (!comp || !comp.is_active || comp.registration_mode !== "open") return { error: "Lomba tidak tersedia untuk pendaftaran ini." };

  if (rows.length > 1 && !allowsBulk(comp)) return { error: `${comp.name}: satu pendaftaran per kirim.` };

  const fields = comp.form_fields ?? [];
  const allowTeam = !!comp.allow_team;
  for (let i = 0; i < rows.length; i++) {
    const errs = validateOpenRow({ ...rows[i], entry_type: rows[i].entry_type === "team" ? "team" : "individual" }, fields, allowTeam);
    if (hasErrors(errs)) return { error: `Peserta ke-${i + 1}: ${Object.values(errs).find(Boolean)}` };
  }

  const { data: count, error } = await supabase.rpc("submit_open_entries", {
    p_competition_id: competitionId,
    p_village_id: villageId,
    p_rows: rows.map((r) => toPayload(r, fields, allowTeam)),
  });
  if (error) return { error: dbError(error) };

  revalidatePath("/desa", "layout");
  revalidatePath("/admin", "layout");
  const n = typeof count === "number" ? count : rows.length;
  return { ok: true, message: `${n} pendaftaran ${comp.name} berhasil dikirim. Terima kasih!` };
}

/** Pendaftaran umum tanpa login (section Pengumpulan Karya di beranda). */
export async function submitPublicEntries(fd: FormData): Promise<ActionState> {
  // Honeypot: bot mengisi kolom tersembunyi ini; pura-pura berhasil.
  if (String(fd.get("website") ?? "").trim() !== "") return { ok: true, message: "Pendaftaran berhasil dikirim." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (tooFast(ip)) return { error: "Terlalu banyak pengiriman. Coba lagi beberapa menit lagi." };

  const villageId = String(fd.get("village_id") ?? "");
  if (!villageId) return { error: "Pilih desa terlebih dahulu." };
  return submit(createAnonClient(), fd, villageId);
}

/** Pendaftaran oleh Admin Desa (desa diambil dari profil di database, bukan dari form). */
export async function submitVillageEntries(fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await getCtx();
  if (!profile || profile.role !== "village_admin" || !profile.village_id) {
    return { error: "Akun Anda bukan Admin Desa." };
  }
  return submit(supabase, fd, null);
}
