import type { SupabaseClient } from "@supabase/supabase-js";
import { teamBounds } from "./lomba";

/**
 * Status "lengkap" tiap pendaftaran dari view `entry_overview` (kolom is_complete sudah
 * memperhitungkan jumlah minimal anggota). RLS membatasi baris sesuai peran pemanggil.
 * Bila view/kolom tidak terbaca, hasilnya kosong dan pemanggil memakai `isComplete` (hitung lokal).
 */
export async function loadCompleteness(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("entry_overview").select("*");
  const map = new Map<string, boolean>();
  if (error) return map;
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const id = (r.entry_id ?? r.id) as string | undefined;
    if (id && typeof r.is_complete === "boolean") map.set(id, r.is_complete);
  }
  return map;
}

/** is_complete dari view; jika tidak ada, hitung dari jumlah anggota dan minimal lomba. */
export function isComplete(
  map: Map<string, boolean>,
  entryId: string,
  memberCount: number,
  comp: { team_size: number | null; team_min_size?: number | null; registration_mode?: string },
) {
  const fromView = map.get(entryId);
  if (fromView !== undefined) return fromView;
  if (comp.registration_mode === "open") return true;
  const { min } = teamBounds(comp);
  return memberCount >= (min ?? 1);
}
