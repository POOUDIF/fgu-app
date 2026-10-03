import { requireRole } from "@/lib/auth";
import { PenaltyForm, PublishButton } from "@/components/AdminForms";
import { fmtScore } from "@/lib/utils";
import { CompIcon } from "@/lib/compIcon";
import type { Competition } from "@/lib/types";

interface Result {
  entry_id: string;
  competition_id: string;
  village_name: string;
  slot_label: string | null;
  ranking_group: string;
  entry_label: string | null;
  avg_total: number;
  penalty: number;
  final_score: number;
  judge_count: number;
  expected_judges: number;
  rank_in_group: number;
}
interface Penalty {
  id: string;
  entry_id: string;
  points: number;
  reason: string | null;
}

export default async function AdminHasil() {
  const { supabase } = await requireRole("super_admin");

  const [compRes, resRes, penRes, entRes] = await Promise.all([
    supabase.from("competitions").select("*").order("sort_order"),
    supabase.from("entry_results").select("*").order("rank_in_group"),
    supabase.from("penalties").select("*").order("created_at"),
    supabase.from("entries").select("competition_id").eq("status", "registered"),
  ]);

  const comps = (compRes.data ?? []) as Competition[];
  const results = (resRes.data ?? []) as Result[];
  const penalties = (penRes.data ?? []) as Penalty[];
  const regCount = new Map<string, number>();
  for (const e of entRes.data ?? []) regCount.set(e.competition_id, (regCount.get(e.competition_id) ?? 0) + 1);

  return (
    <div className="stack">
      <div className="alert info">
        Nilai akhir = rata-rata total nilai seluruh juri − pengurangan nilai. Hasil baru terlihat oleh
        Admin Desa dan publik setelah Anda menekan <b>Publikasikan hasil</b>. Setelah publikasi, juri
        tidak dapat mengirim nilai baru untuk lomba tersebut.
      </div>

      {comps.map((c) => {
        const list = results.filter((r) => r.competition_id === c.id);
        const groups = [...new Set(list.map((r) => r.ranking_group))];
        const registered = regCount.get(c.id) ?? 0;
        return (
          <div className="card" key={c.id}>
            <div className="row between">
              <div>
                <div className="row" style={{ alignItems: "center" }}>
                  <CompIcon name={c.name} size={32} />
                  <h2 style={{ marginBottom: 2 }}>{c.name}</h2>
                </div>
                <div className="muted small">
                  {list.length}/{registered} pendaftaran sudah dinilai · pemenang: {c.winner_count} teratas
                  {c.results_published && <> · <span className="chip green">Terpublikasi</span></>}
                </div>
              </div>
              <PublishButton competitionId={c.id} published={c.results_published} />
            </div>

            {list.length === 0 ? (
              <p className="muted" style={{ marginTop: 10 }}>
                Belum ada nilai masuk.
              </p>
            ) : (
              groups.map((g) => (
                <div key={g} style={{ marginTop: 14 }}>
                  {g && <h3>Kelompok {g}</h3>}
                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Desa</th>
                          <th>Peserta</th>
                          <th>Rata-rata juri</th>
                          <th>Pengurangan</th>
                          <th>Nilai akhir</th>
                          <th>Juri</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {list
                          .filter((r) => r.ranking_group === g)
                          .map((r) => (
                            <tr key={r.entry_id}>
                              <td>
                                <span className={`rank ${r.rank_in_group <= 3 ? `r${r.rank_in_group}` : ""}`}>
                                  {r.rank_in_group}
                                </span>
                              </td>
                              <td>
                                <b>{r.village_name}</b>
                              </td>
                              <td>
                                {r.slot_label && <span className="chip">{r.slot_label}</span>} {r.entry_label}
                              </td>
                              <td>{fmtScore(r.avg_total)}</td>
                              <td>{Number(r.penalty) ? `−${fmtScore(r.penalty)}` : "—"}</td>
                              <td>
                                <b>{fmtScore(r.final_score)}</b>
                              </td>
                              <td>
                                <span className={`chip ${r.judge_count < r.expected_judges ? "yellow" : "green"}`}>
                                  {r.judge_count}/{r.expected_judges}
                                </span>
                              </td>
                              <td style={{ minWidth: 260 }}>
                                <PenaltyForm
                                  entryId={r.entry_id}
                                  penalties={penalties.filter((p) => p.entry_id === r.entry_id)}
                                />
                              </td>
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
      })}
    </div>
  );
}
