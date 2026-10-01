"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/auth";
import { dbError } from "@/lib/utils";
import type { ActionState } from "@/lib/types";

export async function submitScores(fd: FormData): Promise<ActionState> {
  const { supabase, profile } = await getCtx();
  if (!profile || profile.role !== "judge") return { error: "Akun Anda bukan Juri." };

  const entryId = String(fd.get("entry_id") ?? "");
  const slug = String(fd.get("slug") ?? "");

  const scores: Record<string, number> = {};
  for (const [key, raw] of fd.entries()) {
    if (!key.startsWith("c_")) continue;
    const text = String(raw).trim().replace(",", ".");
    const n = Number(text);
    if (text === "" || Number.isNaN(n) || n < 0)
      return { error: "Semua kriteria wajib diisi dengan angka 0 atau lebih." };
    scores[key.slice(2)] = n;
  }

  const { error } = await supabase.rpc("submit_scores", { p_entry_id: entryId, p_scores: scores });
  if (error) return { error: dbError(error) };

  revalidatePath("/juri", "layout");
  redirect(`/juri/${slug}`);
}
