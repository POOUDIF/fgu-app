"use server";

import { revalidatePath } from "next/cache";
import { getCtx, isAdmin, isSuper } from "@/lib/auth";
import { dbError, fromLocalInput } from "@/lib/utils";
import type { ActionState, Role } from "@/lib/types";

/** Super Admin atau Admin Daerah. */
async function adminCtx() {
  const { supabase, user, profile } = await getCtx();
  if (!user || !profile || !isAdmin(profile.role)) return null;
  return { supabase, userId: user.id, role: profile.role };
}
/** Khusus Super Admin (koreksi nilai, pengurangan nilai, akun admin). */
async function superCtx() {
  const ctx = await adminCtx();
  return ctx && isSuper(ctx.role) ? ctx : null;
}
const NO_ACCESS: ActionState = { error: "Hanya panitia (Super Admin / Admin Daerah) yang dapat melakukan ini." };
const NO_SUPER: ActionState = { error: "Hanya Super Admin yang dapat melakukan ini." };
const refresh = () => revalidatePath("/admin", "layout");

export async function setEntryStatus(fd: FormData): Promise<ActionState> {
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "");
  if (status !== "registered" && status !== "disqualified") return { error: "Status tidak valid." };
  const reason = status === "disqualified" ? String(fd.get("reason") ?? "").trim() || null : null;

  const { error } = await ctx.supabase
    .from("entries")
    .update({ status, disqualified_reason: reason })
    .eq("id", id);
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export async function addPenalty(fd: FormData): Promise<ActionState> {
  const ctx = await superCtx();
  if (!ctx) return NO_SUPER;
  const entry_id = String(fd.get("entry_id") ?? "");
  const points = Number(String(fd.get("points") ?? "").replace(",", "."));
  const reason = String(fd.get("reason") ?? "").trim() || null;
  if (!(points > 0)) return { error: "Poin pengurangan harus lebih dari 0." };

  const { error } = await ctx.supabase.from("penalties").insert({ entry_id, points, reason });
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true, message: "Pengurangan nilai dicatat." };
}

export async function deletePenalty(fd: FormData): Promise<ActionState> {
  const ctx = await superCtx();
  if (!ctx) return NO_SUPER;
  const { error } = await ctx.supabase.from("penalties").delete().eq("id", String(fd.get("id") ?? ""));
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true };
}

export async function setPublished(fd: FormData): Promise<ActionState> {
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
  const id = String(fd.get("competition_id") ?? "");
  const publish = String(fd.get("publish") ?? "") === "true";

  const { error } = await ctx.supabase.from("competitions").update({ results_published: publish }).eq("id", id);
  if (error) return { error: dbError(error) };
  refresh();
  revalidatePath("/");
  return { ok: true };
}

export async function updateProfile(fd: FormData): Promise<ActionState> {
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
  const id = String(fd.get("id") ?? "");
  const full_name = String(fd.get("full_name") ?? "").trim();
  const role = String(fd.get("role") ?? "") as Role;
  const village_id = String(fd.get("village_id") ?? "") || null;

  if (!["super_admin", "regional_admin", "village_admin", "judge"].includes(role))
    return { error: "Peran tidak valid." };
  if (id === ctx.userId && role !== ctx.role)
    return { error: "Anda tidak dapat mengubah peran akun Anda sendiri." };
  if (!isSuper(ctx.role)) {
    // Admin Daerah tidak boleh menyentuh akun admin maupun memberi peran admin.
    if (isAdmin(role)) return { error: "Hanya Super Admin yang dapat memberi peran admin." };
    const { data: target } = await ctx.supabase.from("profiles").select("role").eq("id", id).maybeSingle();
    if (!target || isAdmin(target.role as Role)) return NO_SUPER;
  }
  if (role === "village_admin" && !village_id) return { error: "Admin Desa wajib dihubungkan ke desa." };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ full_name, role, village_id: role === "village_admin" ? village_id : null })
    .eq("id", id);
  if (error) return { error: dbError(error) };
  refresh();
  return { ok: true, message: "Akun diperbarui." };
}

export async function saveJudgeAssignments(fd: FormData): Promise<ActionState> {
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
  const judge_id = String(fd.get("judge_id") ?? "");
  const wanted = new Set(fd.getAll("competition").map(String));

  const { data: cur, error: e0 } = await ctx.supabase
    .from("competition_judges")
    .select("competition_id")
    .eq("judge_id", judge_id);
  if (e0) return { error: dbError(e0) };
  const have = new Set((cur ?? []).map((r) => r.competition_id as string));

  const toAdd = [...wanted].filter((c) => !have.has(c));
  const toRemove = [...have].filter((c) => !wanted.has(c));

  if (toAdd.length) {
    const { error } = await ctx.supabase
      .from("competition_judges")
      .insert(toAdd.map((competition_id) => ({ competition_id, judge_id })));
    if (error) return { error: dbError(error) };
  }
  if (toRemove.length) {
    const { error } = await ctx.supabase
      .from("competition_judges")
      .delete()
      .eq("judge_id", judge_id)
      .in("competition_id", toRemove);
    if (error) return { error: dbError(error) };
  }
  refresh();
  return { ok: true, message: "Penugasan disimpan." };
}

export async function updateEvent(fd: FormData): Promise<ActionState> {
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
  const id = String(fd.get("id") ?? "");
  const opens = fromLocalInput(fd.get("registration_opens_at"));
  const closes = fromLocalInput(fd.get("registration_closes_at"));
  if (opens && closes && new Date(opens) >= new Date(closes))
    return { error: "Waktu tutup pendaftaran harus setelah waktu buka." };

  const { error } = await ctx.supabase
    .from("events")
    .update({
      name: String(fd.get("name") ?? "").trim() || "Festival Generasi Unggul 3.0",
      event_date: String(fd.get("event_date") ?? "") || null,
      venue: String(fd.get("venue") ?? "").trim() || null,
      registration_opens_at: opens,
      registration_closes_at: closes,
    })
    .eq("id", id);
  if (error) return { error: dbError(error) };
  refresh();
  revalidatePath("/");
  return { ok: true, message: "Pengaturan acara disimpan." };
}

export async function updateSiteContent(fd: FormData): Promise<ActionState> {
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
  const rows = ["tagline", "about", "announcement"].map((key) => ({
    key,
    value: String(fd.get(key) ?? "").trim(),
  }));
  const { error } = await ctx.supabase.from("site_content").upsert(rows.filter((r) => r.value));
  if (error) return { error: dbError(error) };
  revalidatePath("/");
  return { ok: true, message: "Konten beranda disimpan." };
}

async function targetIsAdmin(supabase: Awaited<ReturnType<typeof getCtx>>["supabase"], id: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", id).maybeSingle();
  return !data || isAdmin(data.role as Role);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createAccount(fd: FormData): Promise<ActionState> {
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const full_name = String(fd.get("full_name") ?? "").trim();
  const role = String(fd.get("role") ?? "");
  const village_id = String(fd.get("village_id") ?? "") || null;
  const competitionIds = fd.getAll("competition").map(String).filter(Boolean);

  if (role === "regional_admin" && !isSuper(ctx.role)) return NO_SUPER;
  if (role !== "judge" && role !== "village_admin" && role !== "regional_admin")
    return { error: "Pilih peran Juri, Admin Desa, atau Admin Daerah." };
  if (!EMAIL_RE.test(email)) return { error: "Format email tidak valid." };
  if (password.length < 6) return { error: "Kata sandi minimal 6 karakter." };
  if (role === "village_admin" && !village_id) return { error: "Admin Desa wajib memilih desa." };

  const { error } = await ctx.supabase.rpc("admin_create_account", {
    p_email: email,
    p_password: password,
    p_full_name: full_name || null,
    p_role: role,
    p_village_id: role === "village_admin" ? village_id : null,
    p_competition_ids: role === "judge" && competitionIds.length ? competitionIds : null,
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: true, message: `Akun dibuat. Email: ${email} · Kata sandi awal: ${password}` };
}

export async function resetPassword(fd: FormData): Promise<ActionState> {
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
  const p_user_id = String(fd.get("id") ?? "");
  const p_password = String(fd.get("password") ?? "");
  if (p_password.length < 6) return { error: "Kata sandi minimal 6 karakter." };
  if (!isSuper(ctx.role) && (await targetIsAdmin(ctx.supabase, p_user_id))) return NO_SUPER;

  const { error } = await ctx.supabase.rpc("admin_reset_password", { p_user_id, p_password });
  if (error) return { error: error.message };
  refresh();
  return { ok: true, message: `Kata sandi diganti menjadi: ${p_password}` };
}

export async function deleteAccount(fd: FormData): Promise<ActionState> {
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
  const p_user_id = String(fd.get("id") ?? "");
  if (p_user_id === ctx.userId) return { error: "Anda tidak dapat menghapus akun Anda sendiri." };
  if (!isSuper(ctx.role) && (await targetIsAdmin(ctx.supabase, p_user_id))) return NO_SUPER;

  const { error } = await ctx.supabase.rpc("admin_delete_account", { p_user_id });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function editScore(fd: FormData): Promise<ActionState> {
  const ctx = await superCtx();
  if (!ctx) return NO_SUPER;
  const p_score_id = String(fd.get("score_id") ?? "");
  const raw = String(fd.get("new_score") ?? "").trim().replace(",", ".");
  const p_new_score = raw === "" ? NaN : Number(raw);
  const p_reason = String(fd.get("reason") ?? "").trim();
  if (!p_score_id) return { error: "Nilai tidak ditemukan." };
  if (!Number.isFinite(p_new_score) || p_new_score < 0) return { error: "Nilai baru tidak valid." };
  if (!p_reason) return { error: "Alasan koreksi wajib diisi." };

  const { error } = await ctx.supabase.rpc("admin_edit_score", { p_score_id, p_new_score, p_reason });
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/");
  return { ok: true, message: "Nilai dikoreksi." };
}

export async function resetJudgeEntry(fd: FormData): Promise<ActionState> {
  const ctx = await superCtx();
  if (!ctx) return NO_SUPER;
  const p_entry_id = String(fd.get("entry_id") ?? "");
  const p_judge_id = String(fd.get("judge_id") ?? "");
  const p_reason = String(fd.get("reason") ?? "").trim();
  if (!p_entry_id || !p_judge_id) return { error: "Data tidak lengkap." };
  if (!p_reason) return { error: "Alasan reset wajib diisi." };

  const { error } = await ctx.supabase.rpc("admin_reset_judge_entry", { p_entry_id, p_judge_id, p_reason });
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/");
  return { ok: true, message: "Input juri direset." };
}
