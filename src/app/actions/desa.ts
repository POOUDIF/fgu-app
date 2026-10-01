"use server";

import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/auth";
import { dbError, LEVELS } from "@/lib/utils";
import type { ActionState, Level } from "@/lib/types";

async function villageCtx() {
  const { supabase, profile } = await getCtx();
  if (!profile || profile.role !== "village_admin" || !profile.village_id) return null;
  return { supabase, villageId: profile.village_id };
}

const NO_ACCESS: ActionState = { error: "Akun Anda bukan Admin Desa." };

function readParticipant(fd: FormData) {
  const full_name = String(fd.get("full_name") ?? "").trim();
  const gender = String(fd.get("gender") ?? "");
  const education_level = String(fd.get("education_level") ?? "") as Level;
  const age = Number(fd.get("age"));
  const gradeRaw = String(fd.get("grade") ?? "").trim();
  const grade = gradeRaw === "" ? null : Number(gradeRaw);

  if (!full_name) return { error: "Nama wajib diisi." };
  if (gender !== "L" && gender !== "P") return { error: "Pilih jenis kelamin." };
  if (!LEVELS.includes(education_level)) return { error: "Pilih jenjang." };
  if (!Number.isInteger(age) || age < 1 || age > 100) return { error: "Usia harus 1–100 tahun." };
  if (grade !== null && (!Number.isInteger(grade) || grade < 1 || grade > 12))
    return { error: "Kelas harus 1–12." };
  if (education_level === "SD" && grade === null)
    return { error: "Kelas wajib diisi untuk peserta SD." };

  return { value: { full_name, gender, education_level, age, grade } };
}

export async function createParticipant(fd: FormData): Promise<ActionState> {
  const ctx = await villageCtx();
  if (!ctx) return NO_ACCESS;
  const r = readParticipant(fd);
  if ("error" in r) return { error: r.error };

  const { error } = await ctx.supabase
    .from("participants")
    .insert({ ...r.value, village_id: ctx.villageId });
  if (error) return { error: dbError(error) };

  revalidatePath("/desa", "layout");
  return { ok: true, message: `${r.value.full_name} ditambahkan.` };
}

export async function updateParticipant(fd: FormData): Promise<ActionState> {
  const ctx = await villageCtx();
  if (!ctx) return NO_ACCESS;
  const id = String(fd.get("id") ?? "");
  const r = readParticipant(fd);
  if ("error" in r) return { error: r.error };

  const { data: cur } = await ctx.supabase
    .from("participants")
    .select("gender,education_level,age,grade")
    .eq("id", id)
    .maybeSingle();
  if (!cur) return { error: "Peserta tidak ditemukan." };

  const { count } = await ctx.supabase
    .from("entry_members")
    .select("participant_id", { count: "exact", head: true })
    .eq("participant_id", id);
  const changedRules =
    cur.gender !== r.value.gender ||
    cur.education_level !== r.value.education_level ||
    cur.age !== r.value.age ||
    cur.grade !== r.value.grade;
  if ((count ?? 0) > 0 && changedRules)
    return {
      error:
        "Peserta sudah terdaftar di lomba. Lepaskan dari pendaftaran dulu bila ingin mengubah jenis kelamin, jenjang, usia, atau kelas.",
    };

  const { error } = await ctx.supabase.from("participants").update(r.value).eq("id", id);
  if (error) return { error: dbError(error) };

  revalidatePath("/desa", "layout");
  return { ok: true, message: "Perubahan disimpan." };
}

export async function deleteParticipant(fd: FormData): Promise<ActionState> {
  const ctx = await villageCtx();
  if (!ctx) return NO_ACCESS;
  const id = String(fd.get("id") ?? "");

  const { count } = await ctx.supabase
    .from("entry_members")
    .select("participant_id", { count: "exact", head: true })
    .eq("participant_id", id);
  if ((count ?? 0) > 0)
    return { error: "Peserta masih terdaftar di lomba. Hapus pendaftarannya terlebih dahulu." };

  const { data, error } = await ctx.supabase.from("participants").delete().eq("id", id).select("id");
  if (error) return { error: dbError(error) };
  if (!data?.length) return { error: "Peserta tidak ditemukan." };

  revalidatePath("/desa", "layout");
  return { ok: true };
}

export async function createEntry(fd: FormData): Promise<ActionState> {
  const ctx = await villageCtx();
  if (!ctx) return NO_ACCESS;

  const competition_id = String(fd.get("competition_id") ?? "");
  const slot_id = String(fd.get("slot_id") ?? "") || null;
  const team_name = String(fd.get("team_name") ?? "").trim() || null;
  const submission_url = String(fd.get("submission_url") ?? "").trim() || null;
  const members = [...new Set(fd.getAll("member").map(String).filter(Boolean))];

  const { data: comp } = await ctx.supabase
    .from("competitions")
    .select("name,team_size")
    .eq("id", competition_id)
    .maybeSingle();
  if (!comp) return { error: "Lomba tidak ditemukan." };

  if (members.length === 0) return { error: "Pilih minimal 1 peserta." };
  if (comp.team_size !== null && members.length !== comp.team_size)
    return {
      error: `Lomba ini membutuhkan tepat ${comp.team_size} anggota (Anda memilih ${members.length}).`,
    };

  const { data: entry, error: e1 } = await ctx.supabase
    .from("entries")
    .insert({ competition_id, village_id: ctx.villageId, slot_id, team_name, submission_url })
    .select("id")
    .single();
  if (e1 || !entry) return { error: dbError(e1) };

  const { error: e2 } = await ctx.supabase
    .from("entry_members")
    .insert(members.map((participant_id) => ({ entry_id: entry.id, participant_id })));
  if (e2) {
    await ctx.supabase.from("entries").delete().eq("id", entry.id); // batalkan pendaftaran setengah jadi
    return { error: dbError(e2) };
  }

  revalidatePath("/desa", "layout");
  return { ok: true, message: "Pendaftaran berhasil disimpan." };
}

export async function deleteEntry(fd: FormData): Promise<ActionState> {
  const ctx = await villageCtx();
  if (!ctx) return NO_ACCESS;
  const id = String(fd.get("id") ?? "");

  const { data, error } = await ctx.supabase.from("entries").delete().eq("id", id).select("id");
  if (error) return { error: dbError(error) };
  if (!data?.length)
    return { error: "Pendaftaran tidak dapat dihapus (jadwal pendaftaran sudah ditutup)." };

  revalidatePath("/desa", "layout");
  return { ok: true };
}

export async function updateSubmissionUrl(fd: FormData): Promise<ActionState> {
  const ctx = await villageCtx();
  if (!ctx) return NO_ACCESS;
  const id = String(fd.get("id") ?? "");
  const submission_url = String(fd.get("submission_url") ?? "").trim() || null;

  const { data, error } = await ctx.supabase
    .from("entries")
    .update({ submission_url })
    .eq("id", id)
    .select("id");
  if (error) return { error: dbError(error) };
  if (!data?.length) return { error: "Tautan tidak dapat diubah." };

  revalidatePath("/desa", "layout");
  return { ok: true, message: "Tautan disimpan." };
}
