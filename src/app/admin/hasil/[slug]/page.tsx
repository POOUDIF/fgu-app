import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSuper, requireAdmin } from "@/lib/auth";
import { fetchAll } from "@/lib/exportGuard";
import { fmtScore } from "@/lib/utils";
import { CompIcon } from "@/lib/compIcon";
import { ResetJudgeButton, ScoreEditButton } from "@/components/ScoreCorrection";
import { fmtDateTime } from "@/lib/utils";
import { RefreshButton } from "@/components/RefreshButton";
import type { Competition } from "@/lib/types";

interface Detail {
  score_id: string;
  entry_id: string;
  scoring_method: "weighted" | "points";
  judge_id: string;
  judge_name: string | null;
  criterion_group: string | null;
  criterion_name: string;
  criterion_order: number;
  max_score: number | string;
  score: number | string;
  weighted_part: number | string | null;
}
interface Result {
  entry_id: string;
  village_name: string;
  slot_label: string | null;
  ranking_group: string | null;
  entry_label: string | null;
  avg_total: number | string | null;
  penalty: number | string | null;
  final_score: number | string | null;
  judge_count: number;
  expected_judges: number;
  rank_in_group: number;
}
interface AuditRow {
  changed_at: string;
  action: "edit" | "reset_judge";
  village_name: string | null;
  entry_label: string | null;
  judge_name: string | null;
  criterion_name: string | null;
  old_score: number | string | null;
  new_score: number | string | null;
  reason: string | null;
  changed_by_name: string | null;
}
interface Progress {
  judge_id: string;
  judge_name: string | null;
  scored_entries: number;
  total_entries: number;
}

export default async function RincianNilai({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, profile } = await requireAdmin();
  const superAdmin = isSuper(profile.role);

  const { data: compData } = await supabase.from("competitions").select("*").eq("slug", slug).maybeSingle();
  if (!compData) notFound();
  const comp = compData as Competition;

  const [assigned, progressRes, results, details, auditRes] = await Promise.all([
    supabase.from("competition_judges").select("judge_id").eq("competition_id", comp.id),
    supabase
      .from("scoring_progress")
      .select("judge_id,judge_name,scored_entries,total_entries")
      .eq("competition_id", comp.id),
    supabase
      .from("entry_results")
      .select(
        "entry_id,village_name,slot_label,ranking_group,entry_label,avg_total,penalty,final_score,judge_count,expected_judges,rank_in_group",
      )
      .eq("competition_id", comp.id)
      .order("rank_in_group"),
    fetchAll<Detail>((from, to) =>
      supabase
        .from("score_details")
        .select(
          "score_id,entry_id,scoring_method,judge_id,judge_name,criterion_group,criterion_name,criterion_order,max_score,score,weighted_part",
        )
        .eq("competition_id", comp.id)
        .order("score_id")
        .range(from, to),
    ),
    supabase
      .from("score_audit_log")
      .select("changed_at,action,village_name,entry_label,judge_name,criterion_name,old_score,new_score,reason,changed_by_name")
      .eq("competition_name", comp.name)
      .order("changed_at", { ascending: false })
      .limit(50),
  ]);
  const audit = (auditRes.data ?? []) as AuditRow[];

  const progress = (progressRes.data ?? []) as Progress[];
  const rows = (results.data ?? []) as Result[];

  // Nama juri: dari progres, lalu profil untuk juri yang belum punya baris progres.
  const names = new Map<string, string>();
  for (const p of progress) names.set(p.judge_id, p.judge_name || "(tanpa nama)");
  const judgeIds = (assigned.data ?? []).map((a) => a.judge_id as string);
  const missing = judgeIds.filter((id) => !names.has(id));
  if (missing.length) {
    const { data } = await supabase.from("profiles").select("id,full_name").in("id", missing);
    for (const p of data ?? []) names.set(p.id, p.full_name || "(tanpa nama)");
  }
  for (const d of details) if (!names.has(d.judge_id)) names.set(d.judge_id, d.judge_name || "(tanpa nama)");
  const judges = [...new Set([...judgeIds, ...details.map((d) => d.judge_id)])]
    .map((id) => ({ id, name: names.get(id) ?? "(tanpa nama)" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const byEntry = new Map<string, Detail[]>();
  for (const d of details) byEntry.set(d.entry_id, [...(byEntry.get(d.entry_id) ?? []), d]);

  const groups = [...new Set(rows.map((r) => r.ranking_group ?? ""))];

  return (
    <div className="stack">
      <div className="row between">
        <Link className="btn ghost sm" href="/admin/hasil">
          ← Hasil & Publikasi
        </Link>
        <RefreshButton />
      </div>

      <div className="card">
        <div className="row" style={{ alignItems: "center" }}>
          <CompIcon name={comp.name} size={32} />
          <h2 style={{ marginBottom: 0 }}>Rincian nilai: {comp.name}</h2>
        </div>
        <div className="muted small" style={{ marginTop: 6 }}>
          {judgeIds.length} juri bertugas · {rows.length} pendaftaran sudah dinilai
        </div>
        {progress.length > 0 && (
          <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
            {progress
              .slice()
              .sort((a, b) => (a.judge_name ?? "").localeCompare(b.judge_name ?? ""))
              .map((p) => (
                <span key={p.judge_id} className={`chip ${p.scored_entries >= p.total_entries ? "green" : "yellow"}`}>
                  {p.judge_name || "(tanpa nama)"}: {p.scored_entries}/{p.total_entries}
                </span>
              ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <p className="muted">Belum ada nilai masuk.</p>
        </div>
      ) : (
        groups.map((g) => (
          <div className="card" key={g}>
            {g && <h3>Kelompok {g}</h3>}
            {rows
              .filter((r) => (r.ranking_group ?? "") === g)
              .map((r) => {
                const list = byEntry.get(r.entry_id) ?? [];
                const points = list[0]?.scoring_method === "points";
                const criteria = new Map<string, Detail>();
                for (const d of list) {
                  const key = `${d.criterion_group ?? ""}|${d.criterion_order}|${d.criterion_name}`;
                  if (!criteria.has(key)) criteria.set(key, d);
                }
                // Urut sesuai sort_order kriteria (urutan grup mengikuti urutan di database).
                const crit = [...criteria.entries()].sort(([, a], [, b]) => a.criterion_order - b.criterion_order);
                const cell = new Map<string, Detail>();
                const totals = new Map<string, number>();
                for (const d of list) {
                  const key = `${d.criterion_group ?? ""}|${d.criterion_order}|${d.criterion_name}`;
                  cell.set(`${key}#${d.judge_id}`, d);
                  totals.set(d.judge_id, (totals.get(d.judge_id) ?? 0) + Number(points ? d.score : d.weighted_part ?? 0));
                }
                return (
                  <details key={r.entry_id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
                    <summary>
                      <span className={`rank ${r.rank_in_group <= 3 ? `r${r.rank_in_group}` : ""}`}>{r.rank_in_group}</span>{" "}
                      {r.village_name} — {r.slot_label ? `${r.slot_label} · ` : ""}
                      {r.entry_label} · <b>{fmtScore(r.final_score)}</b>{" "}
                      <span className={`chip ${r.judge_count < r.expected_judges ? "yellow" : "green"}`}>
                        {r.judge_count}/{r.expected_judges} juri
                      </span>
                    </summary>
                    <div className="tablewrap" style={{ marginTop: 10 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Kriteria</th>
                            {judges.map((j) => (
                              <th key={j.id}>{j.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {crit.map(([key, c], i) => (
                            <Fragment key={key}>
                              {c.criterion_group && c.criterion_group !== crit[i - 1]?.[1].criterion_group && (
                                <tr>
                                  <th colSpan={judges.length + 1} style={{ background: "#f3f7fb", textAlign: "left" }}>
                                    {c.criterion_group}
                                  </th>
                                </tr>
                              )}
                            <tr>
                              <td>{c.criterion_name}</td>
                              {judges.map((j) => {
                                const d = cell.get(`${key}#${j.id}`);
                                return (
                                  <td key={j.id}>
                                    {d ? (
                                      <>
                                        <b>{fmtScore(d.score)}</b>{" "}
                                        <span className="muted small">/ {fmtScore(d.max_score)}</span>
                                        {superAdmin && (
                                          <>
                                            {" "}
                                            <ScoreEditButton
                                              scoreId={d.score_id}
                                              score={Number(d.score)}
                                              max={Number(d.max_score)}
                                              label={`${c.criterion_name} · ${j.name}`}
                                            />
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                            </Fragment>
                          ))}
                          <tr>
                            <td>
                              <b>Total juri</b>
                            </td>
                            {judges.map((j) => (
                              <td key={j.id}>
                                <b>{totals.has(j.id) ? fmtScore(totals.get(j.id)) : "—"}</b>
                              </td>
                            ))}
                          </tr>
                          {superAdmin && (
                            <tr>
                              <td className="muted small">Koreksi</td>
                              {judges.map((j) => (
                                <td key={j.id}>
                                  {totals.has(j.id) ? (
                                    <ResetJudgeButton entryId={r.entry_id} judgeId={j.id} judgeName={j.name} />
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              ))}
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ marginTop: 8 }}>
                      Rata-rata juri: <b>{fmtScore(r.avg_total)}</b> · Pengurangan:{" "}
                      <b>{Number(r.penalty) ? `−${fmtScore(r.penalty)}` : "—"}</b> · Nilai akhir:{" "}
                      <b>{fmtScore(r.final_score)}</b>
                    </p>
                  </details>
                );
              })}
          </div>
        ))
      )}
      <div className="card">
        <h3>Riwayat koreksi nilai</h3>
        {audit.length === 0 ? (
          <p className="muted">Belum ada koreksi.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Aksi</th>
                  <th>Desa / Peserta</th>
                  <th>Juri</th>
                  <th>Kriteria</th>
                  <th>Lama → Baru</th>
                  <th>Alasan</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i}>
                    <td>{fmtDateTime(a.changed_at)}</td>
                    <td>{a.action === "edit" ? "Koreksi nilai" : "Reset input juri"}</td>
                    <td>
                      {a.village_name} — {a.entry_label}
                    </td>
                    <td>{a.judge_name || "—"}</td>
                    <td>{a.criterion_name || "—"}</td>
                    <td>
                      {fmtScore(a.old_score)} → {a.action === "edit" ? fmtScore(a.new_score) : "dihapus"}
                    </td>
                    <td>{a.reason || "—"}</td>
                    <td>{a.changed_by_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">Menampilkan maksimal 50 koreksi terbaru.</p>
      </div>
    </div>
  );
}
