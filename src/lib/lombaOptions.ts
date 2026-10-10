import type { SupabaseClient } from "@supabase/supabase-js";
import { requiresMixedGender, type LombaOption } from "./lomba";
import type { Competition, Gender, Slot } from "./types";

interface EntryRow {
  id: string;
  competition_id: string;
  slot_id: string | null;
  members: { participant: { gender: Gender } | null }[];
}

/**
 * Lomba berbasis peserta (bukan 'open') beserta keterisiannya untuk desa si pemanggil.
 * RLS membatasi `entries` ke desa sendiri; hasil di-filter eksplisit lagi lewat villageId.
 */
export async function loadLombaOptions(supabase: SupabaseClient, villageId: string): Promise<LombaOption[]> {
  const [compRes, entRes] = await Promise.all([
    supabase
      .from("competitions")
      .select("*, slots:competition_slots(*)")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("entries")
      .select("id, competition_id, slot_id, members:entry_members(participant:participants(gender))")
      .eq("village_id", villageId)
      .eq("status", "registered"),
  ]);

  const comps = ((compRes.data ?? []) as (Competition & { slots: Slot[] })[]).filter(
    (c) => (c.registration_mode ?? "participant") !== "open",
  );
  const entries = (entRes.data ?? []) as unknown as EntryRow[];

  return comps.map((c) => {
    const mine = entries.filter((e) => e.competition_id === c.id);
    const takenSlots = new Set(mine.map((e) => e.slot_id));
    const isTeam = c.participation_type === "team";
    // Tim berisi lebih dari 1 orang: peserta baru bergabung ke pendaftaran desa yang belum penuh.
    const joinable = (c.team_size === 1 ? [] : mine)
      .filter((e) => (c.team_size !== null ? e.members.length < c.team_size : isTeam))
      .map((e) => ({
        id: e.id,
        slot_id: e.slot_id,
        genders: e.members.flatMap((m) => (m.participant ? [m.participant.gender] : [])),
      }));

    return {
      id: c.id,
      name: c.name,
      cluster: c.cluster,
      age_label: c.age_label,
      schedule_type: c.schedule_type,
      levels: c.levels,
      grade_min: c.grade_min,
      grade_max: c.grade_max,
      allowed_genders: c.allowed_genders,
      team_size: c.team_size,
      max_entries_per_village: c.max_entries_per_village,
      slots: [...c.slots]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({ id: s.id, gender: s.gender, level: s.level, taken: takenSlots.has(s.id) })),
      entries: mine.length,
      composition_note: c.composition_note,
      mixedGender: requiresMixedGender(c),
      joinable,
    };
  });
}
