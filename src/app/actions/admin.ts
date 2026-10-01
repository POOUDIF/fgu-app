"use server";

import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/auth";
import { dbError, fromLocalInput } from "@/lib/utils";
import type { ActionState, Role } from "@/lib/types";

async function adminCtx() {
  const { supabase, user, profile } = await getCtx();
  if (!user || !profile || profile.role !== "super_admin") return null;
  return { supabase, userId: user.id };
}
const NO_ACCESS: ActionState = { error: "Hanya Admin Daerah yang dapat melakukan ini." };
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
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
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
  const ctx = await adminCtx();
  if (!ctx) return NO_ACCESS;
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

  if (!["super_admin", "village_admin", "judge"].includes(role)) return { error: "Peran tidak valid." };
  if (id === ctx.userId && role !== "super_admin")
    return { error: "Anda tidak dapat menurunkan peran akun Anda sendiri." };
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
