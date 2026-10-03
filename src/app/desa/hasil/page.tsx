import { requireRole } from "@/lib/auth";
import { fmtScore } from "@/lib/utils";

interface Row {
  entry_id: string;
  competition_id: string;
  competition_name: string;
  slot_label: string | null;
  ranking_group: string;
  entry_label: string | null;
  final_score: number;
  rank_in_group: number;
  is_winner: boolean;
}

export default async function HasilDesaPage() {
  const { supabase } = await requireRole("village_admin");
  const { data } = await supabase
    .from("published_results")
    .select("*")
    .order("competition_name")
    .order("rank_in_group");
  const rows = (data ?? []) as Row[];

  const byComp = new Map<string, Row[]>();
  for (const r of rows) byComp.set(r.competition_name, [...(byComp.get(r.competition_name) ?? []), r]);

  return (
    <div className="stack">
      <div className="alert info">
        Hasil hanya tampil setelah panitia mempublikasikan nilai lomba. Di sini hanya hasil
        milik desa Anda.
      </div>
      {byComp.size === 0 ? (
        <div className="card">
          <p className="muted">Belum ada hasil yang dipublikasikan.</p>
        </div>
      ) : (
        [...byComp.entries()].map(([name, list]) => (
          <div className="card" key={name}>
            <h2>{name}</h2>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Peringkat</th>
                    <th>Peserta</th>
                    <th>Nilai akhir</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.entry_id}>
                      <td>
                        <span className={`rank ${r.rank_in_group <= 3 ? `r${r.rank_in_group}` : ""}`}>
                          {r.rank_in_group}
                        </span>{" "}
                        {r.ranking_group && <span className="muted small">{r.ranking_group}</span>}
                      </td>
                      <td>
                        {r.slot_label ? <span className="chip">{r.slot_label}</span> : null}{" "}
                        {r.entry_label}
                      </td>
                      <td>
                        <b>{fmtScore(r.final_score)}</b>
                      </td>
                      <td>{r.is_winner && <span className="chip green">Pemenang</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
