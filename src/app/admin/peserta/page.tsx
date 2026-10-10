import { requireAdmin } from "@/lib/auth";
import { StatusButton } from "@/components/AdminForms";
import { displayName, kelasLabel } from "@/lib/participant";
import { teamBounds } from "@/lib/lomba";
import { GENDER_LABEL } from "@/lib/utils";
import { ExportButton } from "@/components/ExportButton";
import { CompIcon } from "@/lib/compIcon";
import type { Competition, Participant, Village } from "@/lib/types";

interface EntryRow {
  id: string;
  status: "registered" | "disqualified";
  disqualified_reason: string | null;
  team_name: string | null;
  submission_url: string | null;
  ig_username: string | null;
  parent_name: string | null;
  entry_type: "individual" | "team" | null;
  members_note: string | null;
  source: "village" | "public" | null;
  competition: Pick<Competition, "id" | "name" | "team_size" | "team_min_size" | "submission_mode" | "registration_mode"> | null;
  village: { id: string; name: string } | null;
  slot: { label: string } | null;
  members: { participant: Participant | null }[];
}

export default async function AdminPeserta({
  searchParams,
}: {
  searchParams: Promise<{ lomba?: string; desa?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  let q = supabase
    .from("entries")
    .select(
      "id, status, disqualified_reason, team_name, submission_url, ig_username, parent_name, entry_type, members_note, source, competition:competitions(id,name,team_size,team_min_size,submission_mode,registration_mode), village:villages(id,name), slot:competition_slots(label), members:entry_members(participant:participants(*))",
    );
  if (sp.lomba) q = q.eq("competition_id", sp.lomba);
  if (sp.desa) q = q.eq("village_id", sp.desa);

  const [entRes, compRes, vilRes, allPart, allEntries] = await Promise.all([
    q,
    supabase.from("competitions").select("id,name").order("sort_order"),
    supabase.from("villages").select("*").order("sort_order"),
    supabase.from("participants").select("village_id"),
    supabase.from("entries").select("village_id,competition_id").eq("status", "registered"),
  ]);

  const entries = ((entRes.data ?? []) as unknown as EntryRow[]).sort(
    (a, b) =>
      (a.competition?.name ?? "").localeCompare(b.competition?.name ?? "") ||
      (a.village?.name ?? "").localeCompare(b.village?.name ?? ""),
  );
  const comps = compRes.data ?? [];
  const villages = (vilRes.data ?? []) as Village[];

  const pCount = new Map<string, number>();
  for (const p of allPart.data ?? []) pCount.set(p.village_id, (pCount.get(p.village_id) ?? 0) + 1);
  const eCount = new Map<string, number>();
  const cSet = new Map<string, Set<string>>();
  for (const e of allEntries.data ?? []) {
    eCount.set(e.village_id, (eCount.get(e.village_id) ?? 0) + 1);
    cSet.set(e.village_id, (cSet.get(e.village_id) ?? new Set()).add(e.competition_id));
  }

  const exportQs = new URLSearchParams();
  if (sp.lomba) exportQs.set("lomba", sp.lomba);
  if (sp.desa) exportQs.set("desa", sp.desa);
  const exportHref = `/admin/peserta/export${exportQs.size ? `?${exportQs}` : ""}`;

  return (
    <div className="stack">
      <div className="row between">
        <span className="muted small">Ekspor mengikuti filter yang sedang diterapkan.</span>
        <ExportButton href={exportHref} />
      </div>
      <div className="card">
        <h2>Rekap per desa</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Desa</th>
                <th>Peserta terdata</th>
                <th>Pendaftaran</th>
                <th>Lomba diikuti</th>
              </tr>
            </thead>
            <tbody>
              {villages.map((v) => (
                <tr key={v.id}>
                  <td>
                    <b>{v.name}</b>
                  </td>
                  <td>{pCount.get(v.id) ?? 0}</td>
                  <td>{eCount.get(v.id) ?? 0}</td>
                  <td>
                    {cSet.get(v.id)?.size ?? 0}/{comps.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Pendaftaran lomba ({entries.length})</h2>
        <form className="fields" method="get" style={{ marginBottom: 14 }}>
          <div>
            <label htmlFor="lomba">Lomba</label>
            <select id="lomba" name="lomba" defaultValue={sp.lomba ?? ""}>
              <option value="">Semua lomba</option>
              {comps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="desa">Desa</label>
            <select id="desa" name="desa" defaultValue={sp.desa ?? ""}>
              <option value="">Semua desa</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button className="btn primary" type="submit">
              Terapkan filter
            </button>
          </div>
        </form>

        {entries.length === 0 ? (
          <p className="muted">Tidak ada pendaftaran.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Lomba</th>
                  <th>Desa</th>
                  <th>Peserta</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const need = e.competition?.registration_mode === "open" ? 0 : (teamBounds(e.competition ?? { team_size: null }).min ?? 1);
                  const incomplete = e.members.length < need;
                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="row" style={{ alignItems: "center", gap: 8 }}>
                          <CompIcon name={e.competition?.name} size={28} />
                          <b>{e.competition?.name}</b>
                        </div>
                        {e.slot && (
                          <div>
                            <span className="chip">{e.slot.label}</span>
                          </div>
                        )}
                      </td>
                      <td>{e.village?.name}</td>
                      <td>
                        {e.team_name && <b>{e.team_name}</b>}
                        {e.entry_type === "team" && <span className="chip">Tim</span>}
                        {e.source === "public" && <span className="chip yellow">Umum (tanpa login)</span>}
                        {(e.ig_username || e.parent_name || e.members_note) && (
                          <div className="muted small">
                            {[
                              e.parent_name && `Orang tua: ${e.parent_name}`,
                              e.ig_username && `IG: @${e.ig_username}`,
                              e.members_note && `Anggota: ${e.members_note}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {e.members.map(
                            (m) =>
                              m.participant && (
                                <li key={m.participant.id}>
                                  {displayName(m.participant)}{" "}
                                  <span className="muted small">
                                    {GENDER_LABEL[m.participant.gender]} ·{" "}
                                    {kelasLabel(m.participant.education_level, m.participant.grade)}
                                    {m.participant.age ? ` · ${m.participant.age} th` : ""}
                                  </span>
                                </li>
                              ),
                          )}
                        </ul>
                        {(e.competition?.submission_mode === "online" || !!e.submission_url) && (
                          <div className="small">
                            {e.submission_url ? (
                              <a href={e.submission_url} target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>
                                Tautan karya ↗
                              </a>
                            ) : (
                              <span className="chip yellow">Tautan belum diisi</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {e.status === "disqualified" ? (
                          <span className="chip red">Diskualifikasi</span>
                        ) : incomplete ? (
                          <span className="chip yellow">
                            Anggota {e.members.length}/{need}
                          </span>
                        ) : (
                          <span className="chip green">Lengkap</span>
                        )}
                      </td>
                      <td>
                        <StatusButton entryId={e.id} disqualified={e.status === "disqualified"} />
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
  );
}
