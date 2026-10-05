"use server";

import { revalidatePath } from "next/cache";
import { getCtx } from "@/lib/auth";
import { dbError } from "@/lib/utils";
import { firstError, usesGrade, validateParticipant } from "@/lib/participant";
import { PHOTO_BUCKET } from "@/lib/photo";
import type { ActionState, Level } from "@/lib/types";

async function villageCtx() {
  const { supabase, profile } = await getCtx();
  if (!profile || profile.role !== "village_admin" || !profile.village_id) return null;
  return { supabase, villageId: profile.village_id };
}

const NO_ACCESS: ActionState = { error: "Akun Anda bukan Admin Desa." };

function readParticipant(fd: FormData, hasPhoto: boolean) {
  const raw = {
    full_name: String(fd.get("full_name") ?? ""),
    parent_name: String(fd.get("parent_name") ?? ""),
    gender: String(fd.get("gender") ?? ""),
    education_level: String(fd.get("education_level") ?? ""),
    grade: String(fd.get("grade") ?? ""),
    age: String(fd.get("age") ?? ""),
  };
  const err = firstError(validateParticipant({ ...raw, hasPhoto }));
  if (err) return { error: err.message };

  const education_level = raw.education_level as Level;
  const grade = usesGrade(education_level) && raw.grade.trim() !== "" ? Number(raw.grade) : null;
  return {
    value: {
      full_name: raw.full_name.trim(),
      parent_name: raw.parent_name.trim(),
      gender: raw.gender as "L" | "P",
      education_level,
      age: Number(raw.age),
      grade,
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** photo_path opsional; bila ada harus `${villageId}/${participantId}.(jpg|png|webp)`. */
function readPhotoPath(fd: FormData, villageId: string, id: string) {
  const path = String(fd.get("photo_path") ?? "").trim();
  if (!path) return { value: null };
  const prefix = `${villageId}/${id}.`;
  if (!id || !path.startsWith(prefix) || !["jpg", "png", "webp"].includes(path.slice(prefix.length)))
    return { error: "Path foto tidak valid." };
  return { value: path };
}

async function removePhoto(supabase: Awaited<ReturnType<typeof getCtx>>["supabase"], path: string) {
  await supabase.storage.from(PHOTO_BUCKET).remove([path]); // best-effort
}

export async function createParticipant(fd: FormData): Promise<ActionState> {
  const ctx = await villageCtx();
  if (!ctx) return NO_ACCESS;

  // id dibuat di klien agar foto bisa diunggah ke path-nya sebelum baris dibuat.
  const id = String(fd.get("id") ?? "");
  if (id && !UUID.test(id)) return { error: "ID peserta tidak valid." };
  const photo = id ? readPhotoPath(fd, ctx.villageId, id) : { value: null };
  if ("error" in photo) return { error: photo.error };

  const r = readParticipant(fd, photo.value !== null);
  if ("error" in r) return { error: r.error };

  const { error } = await ctx.supabase
    .from("participants")
    .insert({
      ...r.value,
      village_id: ctx.villageId,
      ...(id && { id }),
      photo_path: photo.value,
    });
  if (error) return { error: dbError(error) };

  revalidatePath("/desa", "layout");
  return { ok: true, message: `${r.value.full_name} ditambahkan.` };
}

export async function updateParticipant(fd: FormData): Promise<ActionState> {
  const ctx = await villageCtx();
  if (!ctx) return NO_ACCESS;
  const id = String(fd.get("id") ?? "");

  const { data: cur } = await ctx.supabase
    .from("participants")
    .select("gender,education_level,age,grade,photo_path")
    .eq("id", id)
    .maybeSingle();
  if (!cur) return { error: "Peserta tidak ditemukan." };

  const photo = readPhotoPath(fd, ctx.villageId, id);
  if ("error" in photo) return { error: photo.error };

  // Saat ubah, foto boleh kosong selama peserta sudah punya foto.
  const r = readParticipant(fd, photo.value !== null || !!cur.photo_path);
  if ("error" in r) return { error: r.error };

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

  const { error } = await ctx.supabase
    .from("participants")
    .update(photo.value ? { ...r.value, photo_path: photo.value } : r.value)
    .eq("id", id);
  if (error) return { error: dbError(error) };

  // Ekstensi foto berubah (mis. png -> webp): buang berkas lama.
  if (photo.value && cur.photo_path && cur.photo_path !== photo.value)
    await removePhoto(ctx.supabase, cur.photo_path);

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

  const { data, error } = await ctx.supabase
    .from("participants")
    .delete()
    .eq("id", id)
    .select("id,photo_path");
  if (error) return { error: dbError(error) };
  if (!data?.length) return { error: "Peserta tidak ditemukan." };
  if (data[0].photo_path) await removePhoto(ctx.supabase, data[0].photo_path);

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
