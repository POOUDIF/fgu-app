import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import type { Competition } from "@/lib/types";

interface EntryRow {
  id: string;
  team_name: string | null;
  submission_url: string | null;
  slot: { label: string } | null;
  village: { name: string } | null;
  members: { participant: { full_name: string } | null }[];
}

export default async function JuriLombaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await requireRole("judge");

  const { data: compData } = await supabase.from("competitions").select("*").eq("slug", slug).maybeSingle();
  if (!compData) notFound();
  const comp = compData as Competition;

  const [entRes, scoreRes] = await Promise.all([
    supabase
      .from("entries")
      .select(
        "id, team_name, submission_url, slot:competition_slots(label), village:villages(name), members:entry_members(participant:participants(full_name))",
      )
      .eq("competition_id", comp.id)
      .eq("status", "registered"),
    supabase.from("scores").select("entry_id").eq("judge_id", user.id),
  ]);

  const entries = ((entRes.data ?? []) as unknown as EntryRow[]).sort((a, b) =>
    (a.village?.name ?? "").localeCompare(b.village?.name ?? ""),
  );
  const scored = new Set((scoreRes.data ?? []).map((s) => s.entry_id as string));
  const done = entries.filter((e) => scored.has(e.id)).length;

  return (
    <div className="stack" style={{ marginTop: 12 }}>
      <div className="row between">
        <div>
          <h2>{comp.name}</h2>
          <div className="muted">
            {comp.age_label} · Dinilai {done}/{entries.length}
          </div>
        </div>
        <Link className="btn ghost sm" href="/juri">
          ← Semua lomba
        </Link>
      </div>

      {comp.results_published && (
        <div className="alert info">Hasil lomba ini sudah dipublikasikan; penilaian ditutup.</div>
      )}

      {entries.length === 0 ? (
        <div className="card">
          <p className="muted">Belum ada peserta terdaftar pada lomba ini.</p>
        </div>
      ) : (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Desa</th>
                <th>Peserta</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const isDone = scored.has(e.id);
                const names = e.members.map((m) => m.participant?.full_name).filter(Boolean).join(", ");
                return (
                  <tr key={e.id}>
                    <td>
                      <b>{e.village?.name}</b>
                    </td>
                    <td>
                      {e.slot && <span className="chip">{e.slot.label}</span>}{" "}
                      {e.team_name && <b>{e.team_name}: </b>}
                      {names || "—"}
                      {e.submission_url && (
                        <div className="small">
                          <a href={e.submission_url} target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>
                            Buka karya ↗
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      {isDone ? (
                        <span className="chip green">Sudah dinilai</span>
                      ) : (
                        <span className="chip gray">Belum</span>
                      )}
                    </td>
                    <td className="right">
                      <Link
                        className={`btn sm ${isDone ? "ghost" : "primary"}`}
                        href={`/juri/${comp.slug}/${e.id}`}
                      >
                        {isDone ? "Lihat nilai" : "Beri nilai"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
