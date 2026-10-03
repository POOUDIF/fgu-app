import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { deleteEntry, updateSubmissionUrl } from "@/app/actions/desa";
import { EntryForm } from "@/components/EntryForm";
import { DeleteButton } from "@/components/DeleteButton";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { beforeDeadline, fmtDateTime, GENDER_LABEL, isEligible, registrationStatus } from "@/lib/utils";
import { CompIcon } from "@/lib/compIcon";
import type { Competition, EventRow, Participant, Slot } from "@/lib/types";

type CompFull = Competition & { slots: Slot[] };
interface EntryRow {
  id: string;
  team_name: string | null;
  submission_url: string | null;
  status: string;
  slot: { label: string } | null;
  slot_id: string | null;
  members: { participant: Participant }[];
}

export default async function LombaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requireRole("village_admin");

  const { data: compData } = await supabase
    .from("competitions")
    .select("*, slots:competition_slots(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (!compData) notFound();
  const comp = compData as CompFull;
  comp.slots.sort((a, b) => a.sort_order - b.sort_order);

  const [evRes, entRes, partRes, memRes] = await Promise.all([
    supabase.from("events").select("*").order("created_at").limit(1).maybeSingle(),
    supabase
      .from("entries")
      .select(
        "id, team_name, submission_url, status, slot_id, slot:competition_slots(label), members:entry_members(participant:participants(*))",
      )
      .eq("competition_id", comp.id)
      .order("created_at"),
    supabase.from("participants").select("*").order("full_name"),
    supabase.from("entry_members").select("participant_id"),
  ]);

  const reg = registrationStatus(evRes.data as EventRow | null);
  const entries = (entRes.data ?? []) as unknown as EntryRow[];
  const taken = new Set((memRes.data ?? []).map((m) => m.participant_id as string));
  const eligible = ((partRes.data ?? []) as Participant[]).filter(
    (p) => isEligible(p, comp) && !taken.has(p.id),
  );

  const activeEntries = entries.filter((e) => e.status === "registered");
  const filledSlots = new Set(activeEntries.map((e) => e.slot_id));
  const freeSlots = comp.slots.filter((s) => !filledSlots.has(s.id));
  const hasCapacity =
    comp.slots.length > 0
      ? freeSlots.length > 0
      : comp.max_entries_per_village === null || activeEntries.length < comp.max_entries_per_village;

  const canEditUrl = reg.open || beforeDeadline(comp.submission_deadline);

  return (
    <div className="stack">
      <div className="card">
        <div className="row between">
          <div>
            <div className="row">
              <span className="chip">{comp.cluster}</span>
              {comp.submission_mode === "online" && <span className="chip yellow">Online</span>}
            </div>
            <div className="row" style={{ alignItems: "center", marginTop: 8 }}>
              <CompIcon name={comp.name} size={40} />
              <h2 style={{ margin: 0 }}>{comp.name}</h2>
            </div>
          </div>
          <Link className="btn ghost sm" href="/desa/lomba">
            ← Semua lomba
          </Link>
        </div>
        <ul className="muted" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          <li>Kategori: {comp.age_label}</li>
          <li>
            {comp.participation_type === "team"
              ? `Regu/tim${comp.team_size ? `, tepat ${comp.team_size} anggota` : " (jumlah anggota bebas)"}`
              : "Perorangan"}
            {comp.composition_note ? ` — ${comp.composition_note}` : ""}
          </li>
          <li>
            Kuota:{" "}
            {comp.slots.length > 0
              ? `${comp.slots.length} slot per desa (${comp.slots.map((s) => s.label).join(", ")})`
              : comp.max_entries_per_village
                ? `${comp.max_entries_per_village} pendaftaran per desa`
                : "tidak dibatasi"}
          </li>
          {comp.submission_deadline && <li>Batas pengumpulan karya: {fmtDateTime(comp.submission_deadline)}</li>}
        </ul>
        {comp.composition_note && (
          <div className="alert info small">
            Komposisi &ldquo;{comp.composition_note}&rdquo; dicek manual oleh panitia; sistem hanya
            membatasi jumlah anggota.
          </div>
        )}
      </div>

      <div className="card">
        <h2>Pendaftaran desa Anda ({activeEntries.length})</h2>
        {entries.length === 0 ? (
          <p className="muted">Belum ada pendaftaran.</p>
        ) : (
          <div className="stack">
            {entries.map((e) => (
              <div key={e.id} className="card" style={{ boxShadow: "none" }}>
                <div className="row between">
                  <div className="row">
                    {e.slot && <span className="chip">{e.slot.label}</span>}
                    {e.team_name && <b>{e.team_name}</b>}
                    {e.status !== "registered" && <span className="chip red">Didiskualifikasi</span>}
                  </div>
                  {reg.open && (
                    <DeleteButton
                      action={deleteEntry}
                      id={e.id}
                      confirm="Hapus pendaftaran ini?"
                      label="Hapus pendaftaran"
                    />
                  )}
                </div>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {e.members.map((m) => (
                    <li key={m.participant.id}>
                      {m.participant.full_name}{" "}
                      <span className="muted small">
                        · {GENDER_LABEL[m.participant.gender]} · {m.participant.education_level}
                        {m.participant.grade ? ` kls ${m.participant.grade}` : ""} ·{" "}
                        {m.participant.age} th
                      </span>
                    </li>
                  ))}
                </ul>
                {comp.team_size !== null && e.members.length < comp.team_size && (
                  <div className="chip yellow">Anggota belum lengkap</div>
                )}
                {comp.submission_mode === "online" && (
                  <div style={{ marginTop: 10 }}>
                    {canEditUrl ? (
                      <ActionForm action={updateSubmissionUrl}>
                        <input type="hidden" name="id" value={e.id} />
                        <div className="row">
                          <input
                            name="submission_url"
                            type="url"
                            placeholder="Tautan karya https://"
                            defaultValue={e.submission_url ?? ""}
                            style={{ flex: 1, minWidth: 220 }}
                          />
                          <SubmitButton className="btn soft sm">Simpan tautan</SubmitButton>
                        </div>
                      </ActionForm>
                    ) : (
                      <span className="muted small">Tautan: {e.submission_url ?? "—"}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Tambah pendaftaran</h2>
        {!reg.open ? (
          <div className="alert err">Pendaftaran ditutup. {reg.label}</div>
        ) : !hasCapacity ? (
          <div className="alert info">Kuota lomba ini sudah terisi untuk desa Anda.</div>
        ) : (
          <EntryForm
            competitionId={comp.id}
            slots={freeSlots.map((s) => ({ id: s.id, label: s.label, gender: s.gender, level: s.level }))}
            participants={eligible}
            teamSize={comp.team_size}
            isTeam={comp.participation_type === "team"}
            online={comp.submission_mode === "online"}
          />
        )}
      </div>
    </div>
  );
}
