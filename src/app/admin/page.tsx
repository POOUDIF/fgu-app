import { requireAdmin } from "@/lib/auth";
import { LiveFeed, type Submission } from "@/components/LiveFeed";

interface Progress {
  competition_id: string;
  competition_name: string;
  judge_id: string;
  judge_name: string;
  total_entries: number;
  scored_entries: number;
}

export default async function AdminLive() {
  const { supabase } = await requireAdmin();

  const [partRes, entRes, subRes, progRes, feedRes] = await Promise.all([
    supabase.from("participants").select("id", { count: "exact", head: true }),
    supabase.from("entries").select("village_id").eq("status", "registered"),
    supabase.from("live_submissions").select("entry_id", { count: "exact", head: true }),
    supabase.from("scoring_progress").select("*").order("competition_name"),
    supabase
      .from("live_submissions")
      .select("*")
      .order("submitted_at", { ascending: false })
      .range(0, 9),
  ]);

  const entries = entRes.data ?? [];
  const villages = new Set(entries.map((e) => e.village_id)).size;
  const progress = (progRes.data ?? []) as Progress[];
  const expected = progress.reduce((s, p) => s + p.total_entries, 0);
  const done = progress.reduce((s, p) => s + p.scored_entries, 0);
  const pct = expected ? Math.round((done / expected) * 100) : 0;

  return (
    <div className="stack">
      <div className="grid g4">
        <div className="stat">
          <b>{partRes.count ?? 0}</b>
          <span>Peserta terdata</span>
        </div>
        <div className="stat">
          <b>{entries.length}</b>
          <span>Pendaftaran lomba · {villages}/9 desa</span>
        </div>
        <div className="stat">
          <b>{subRes.count ?? 0}</b>
          <span>Penilaian juri masuk</span>
        </div>
        <div className="stat">
          <b>{pct}%</b>
          <span>
            Progres penilaian ({done}/{expected})
          </span>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <h2>Penilaian masuk (live)</h2>
          <LiveFeed initial={(feedRes.data ?? []) as Submission[]} initialTotal={subRes.count ?? 0} />
        </div>

        <div className="card">
          <h2>Progres per lomba &amp; juri</h2>
          {progress.length === 0 ? (
            <p className="muted">Belum ada juri yang ditugaskan.</p>
          ) : (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Lomba</th>
                    <th>Juri</th>
                    <th>Dinilai</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((p) => {
                    const w = p.total_entries ? (p.scored_entries / p.total_entries) * 100 : 0;
                    return (
                      <tr key={p.competition_id + p.judge_id}>
                        <td>{p.competition_name}</td>
                        <td>{p.judge_name || "—"}</td>
                        <td style={{ minWidth: 130 }}>
                          <div className="row between small">
                            <span />
                            <b>
                              {p.scored_entries}/{p.total_entries}
                            </b>
                          </div>
                          <div className="bar">
                            <i style={{ width: `${w}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
