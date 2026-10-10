import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { CompIcon } from "@/lib/compIcon";
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

  const clusters: { name: string; items: typeof comps }[] = [];
  for (const c of comps) {
    const name = c.cluster ?? "Lomba";
    const g = clusters.find((x) => x.name === name);
    if (g) g.items.push(c);
    else clusters.push({ name, items: [c] });
  }

  return (
    <div className="stack">
      {clusters.map((g) => (
        <section key={g.name}>
          <h3 className="lomba-cluster-title">{g.name}</h3>
          <div className="grid g3">
            {g.items.map((c) => {
              const n = counts.get(c.id) ?? 0;
              const target = c.slots.length || c.max_entries_per_village;
              return (
                <Link key={c.id} href={`/desa/lomba/${c.slug}`} className="card comp">
                  <div className="row" style={{ alignItems: "center" }}>
                    <CompIcon name={c.name} />
                    <span className="chip">{c.schedule_type === "pre_event" ? "Pre-event" : "Hari H"}</span>
                    {c.submission_mode === "online" && <span className="chip yellow">Online</span>}
                  </div>
                  <h3>{c.name}</h3>
                  <div className="muted small">{c.age_label}</div>
                  {c.composition_note && <div className="muted small">📝 {c.composition_note}</div>}
                  <div className="row between" style={{ marginTop: "auto" }}>
                    <span className="muted small">
                      Terisi: <b>{n}</b>
                      {target !== null ? ` dari ${target}` : ""}
                    </span>
                    <span className="btn soft sm">Kelola →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
