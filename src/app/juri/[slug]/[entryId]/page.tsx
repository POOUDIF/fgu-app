import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { ScoreForm } from "@/components/ScoreForm";
import { fmtScore } from "@/lib/utils";
import type { Competition, Criterion } from "@/lib/types";

interface EntryRow {
  id: string;
  team_name: string | null;
  submission_url: string | null;
  slot: { label: string } | null;
  village: { name: string } | null;
  members: { participant: { full_name: string } | null }[];
}

export default async function NilaiPage({
  params,
}: {
  params: Promise<{ slug: string; entryId: string }>;
}) {
  const { slug, entryId } = await params;
  const { supabase, user } = await requireRole("judge");

  const { data: compData } = await supabase.from("competitions").select("*").eq("slug", slug).maybeSingle();
  if (!compData) notFound();
  const comp = compData as Competition;

  const [entRes, critRes, scoreRes] = await Promise.all([
    supabase
      .from("entries")
      .select(
        "id, team_name, submission_url, slot:competition_slots(label), village:villages(name), members:entry_members(participant:participants(full_name))",
      )
      .eq("id", entryId)
      .eq("competition_id", comp.id)
      .maybeSingle(),
    supabase.from("criteria").select("*").eq("competition_id", comp.id),
    supabase.from("scores").select("criterion_id,score").eq("entry_id", entryId).eq("judge_id", user.id),
  ]);
  if (!entRes.data) notFound();

  const entry = entRes.data as unknown as EntryRow;
  const criteria = ((critRes.data ?? []) as Criterion[]).sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const mine = new Map((scoreRes.data ?? []).map((s) => [s.criterion_id as string, Number(s.score)]));
  const locked = mine.size > 0;
  const names = entry.members.map((m) => m.participant?.full_name).filter(Boolean).join(", ");

  const total = (() => {
    if (comp.scoring_method === "points") return [...mine.values()].reduce((a, b) => a + b, 0);
    const w = criteria.reduce((s, c) => s + c.weight, 0);
    const sum = criteria.reduce((s, c) => s + ((mine.get(c.id) ?? 0) / c.max_score) * c.weight, 0);
    return w ? (100 * sum) / w : 0;
  })();

  return (
    <div className="stack" style={{ marginTop: 12 }}>
      <div className="row between">
        <h2>{comp.name}</h2>
        <Link className="btn ghost sm" href={`/juri/${comp.slug}`}>
          ← Daftar peserta
        </Link>
      </div>

      <div className="card">
        <div className="row">
          <span className="chip">{entry.village?.name}</span>
          {entry.slot && <span className="chip gray">{entry.slot.label}</span>}
        </div>
        <h3 style={{ marginTop: 8 }}>
          {entry.team_name ? `${entry.team_name} — ` : ""}
          {names || "—"}
        </h3>
        {entry.submission_url && (
          <a href={entry.submission_url} target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>
            Buka karya ↗
          </a>
        )}
      </div>

      <div className="card">
        {comp.results_published && !locked ? (
          <div className="alert info">Hasil sudah dipublikasikan; penilaian ditutup.</div>
        ) : locked ? (
          <>
            <div className="alert ok">Nilai Anda sudah tersimpan dan terkunci.</div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Kriteria</th>
                    <th>Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {c.group_name ? <span className="muted">{c.group_name} · </span> : null}
                        {c.name}
                      </td>
                      <td>
                        <b>{fmtScore(mine.get(c.id))}</b>{" "}
                        <span className="muted small">/ {fmtScore(c.max_score)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 12 }}>
              Total: <b style={{ fontSize: "1.3rem" }}>{fmtScore(total)}</b>
            </p>
          </>
        ) : (
          <ScoreForm
            entryId={entry.id}
            slug={comp.slug}
            criteria={criteria}
            method={comp.scoring_method}
          />
        )}
      </div>
    </div>
  );
}
