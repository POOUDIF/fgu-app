import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { CompIcon } from "@/lib/compIcon";
import type { Competition } from "@/lib/types";

interface Progress {
  competition_id: string;
  total_entries: number;
  scored_entries: number;
}

export default async function JuriHome() {
  const { supabase, user } = await requireRole("judge");

  const [asgRes, progRes] = await Promise.all([
    supabase.from("competition_judges").select("competition:competitions(*)").eq("judge_id", user.id),
    supabase.from("scoring_progress").select("competition_id,total_entries,scored_entries").eq("judge_id", user.id),
  ]);

  const comps = ((asgRes.data ?? []) as unknown as { competition: Competition | null }[])
    .map((a) => a.competition)
    .filter((c): c is Competition => !!c)
    .sort((a, b) => a.sort_order - b.sort_order);
  const prog = new Map(((progRes.data ?? []) as Progress[]).map((p) => [p.competition_id, p]));

  if (comps.length === 0) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Belum ada lomba yang ditugaskan</h2>
        <p className="muted">
          Hubungi Admin Daerah untuk menugaskan Anda ke satu atau beberapa lomba.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="muted">Pilih lomba yang akan Anda nilai.</p>
      <div className="grid g3">
        {comps.map((c) => {
          const p = prog.get(c.id);
          const total = p?.total_entries ?? 0;
          const done = p?.scored_entries ?? 0;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <Link key={c.id} href={`/juri/${c.slug}`} className="card comp">
              <div className="row" style={{ alignItems: "center" }}>
                <CompIcon name={c.name} />
                <span className="chip">{c.cluster ?? "Lomba"}</span>
              </div>
              <h3>{c.name}</h3>
              <div className="muted small">{c.age_label}</div>
              {c.results_published && <span className="chip gray">Hasil sudah dipublikasikan</span>}
              <div style={{ marginTop: "auto" }}>
                <div className="row between small">
                  <span className="muted">Dinilai</span>
                  <b>
                    {done}/{total}
                  </b>
                </div>
                <div className="bar">
                  <i style={{ width: `${pct}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
