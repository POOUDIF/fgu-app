import { requireRole } from "@/lib/auth";
import { registrationStatus } from "@/lib/utils";
import { CompIcon } from "@/lib/compIcon";
import { isComplete, loadCompleteness } from "@/lib/entryOverview";
import type { Competition, EventRow } from "@/lib/types";

interface Row {
  id: string;
  competition_id: string;
  status: string;
  members: { participant_id: string }[];
}

export default async function DesaHome() {
  const { supabase } = await requireRole("village_admin");

  const [evRes, compRes, entRes, partRes, completeMap] = await Promise.all([
    supabase.from("events").select("*").order("created_at").limit(1).maybeSingle(),
    supabase
      .from("competitions")
      .select("*, slots:competition_slots(id)")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("entries")
      .select("id, competition_id, status, members:entry_members(participant_id)")
      .eq("status", "registered"),
    supabase.from("participants").select("id", { count: "exact", head: true }),
    loadCompleteness(supabase),
  ]);

  const ev = evRes.data as EventRow | null;
  const comps = (compRes.data ?? []) as (Competition & { slots: { id: string }[] })[];
  const entries = (entRes.data ?? []) as Row[];
  const reg = registrationStatus(ev);

  const rows = comps.map((c) => {
    const mine = entries.filter((e) => e.competition_id === c.id);
    const target = c.slots.length || c.max_entries_per_village;
    const incomplete = mine.some((e) => !isComplete(completeMap, e.id, e.members.length, c));
    return { c, registered: mine.length, target, incomplete };
  });
  const done = rows.filter((r) => r.target !== null && r.registered >= r.target && !r.incomplete).length;

  return (
    <div className="stack">
      <div className={`alert ${reg.open ? "ok" : "err"}`}>
        Pendaftaran: <b>{reg.open ? "Dibuka" : "Ditutup"}</b> · {reg.label}
      </div>

      <div className="grid g4">
        <div className="stat">
          <b>{partRes.count ?? 0}</b>
          <span>Peserta terdata</span>
        </div>
        <div className="stat">
          <b>{entries.length}</b>
          <span>Pendaftaran lomba</span>
        </div>
        <div className="stat">
          <b>
            {done}/{rows.filter((r) => r.target !== null).length}
          </b>
          <span>Lomba berkuota yang sudah terisi</span>
        </div>
      </div>

      <div className="card">
        <h2>Status per lomba</h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Lomba</th>
                <th>Kategori</th>
                <th>Terdaftar</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, registered, target, incomplete }) => (
                <tr key={c.id}>
                  <td>
                    <div className="row" style={{ alignItems: "center", gap: 8 }}>
                      <CompIcon name={c.name} size={28} />
                      <b>{c.name}</b>
                    </div>
                  </td>
                  <td className="muted">{c.age_label}</td>
                  <td>
                    {registered}
                    {target !== null ? ` / ${target}` : ""}
                  </td>
                  <td>
                    {incomplete ? (
                      <span className="chip yellow">Anggota belum lengkap</span>
                    ) : target !== null && registered >= target ? (
                      <span className="chip green">Terisi</span>
                    ) : registered > 0 ? (
                      <span className="chip">Sebagian</span>
                    ) : (
                      <span className="chip gray">Belum daftar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
