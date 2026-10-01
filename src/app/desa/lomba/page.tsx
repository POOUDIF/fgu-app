import Link from "next/link";
import { requireRole } from "@/lib/auth";
import type { Competition } from "@/lib/types";

export default async function LombaListPage() {
  const { supabase } = await requireRole("village_admin");
  const [compRes, entRes] = await Promise.all([
    supabase
      .from("competitions")
      .select("*, slots:competition_slots(id)")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("entries").select("competition_id").eq("status", "registered"),
  ]);
  const comps = (compRes.data ?? []) as (Competition & { slots: { id: string }[] })[];
  const counts = new Map<string, number>();
  for (const e of entRes.data ?? []) counts.set(e.competition_id, (counts.get(e.competition_id) ?? 0) + 1);

  return (
    <div className="grid g3">
      {comps.map((c) => {
        const n = counts.get(c.id) ?? 0;
        const target = c.slots.length || c.max_entries_per_village;
        return (
          <Link key={c.id} href={`/desa/lomba/${c.slug}`} className="card comp">
            <div className="row">
              <span className="chip">{c.cluster ?? "Lomba"}</span>
              {c.submission_mode === "online" && <span className="chip yellow">Online</span>}
            </div>
            <h3>{c.name}</h3>
            <div className="muted small">{c.age_label}</div>
            <div className="row between" style={{ marginTop: "auto" }}>
              <span className="muted small">
                Terdaftar: <b>{n}</b>
                {target !== null ? ` / ${target}` : ""}
              </span>
              <span className="btn soft sm">Kelola →</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
