import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { deleteEntry, updateSubmissionUrl } from "@/app/actions/desa";
import { EntryForm } from "@/components/EntryForm";
import { OpenEntryForm } from "@/components/OpenEntryForm";
import { submitVillageEntries } from "@/app/actions/open";
import type { OpenComp } from "@/lib/openEntry";
import { DeleteButton } from "@/components/DeleteButton";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { displayName, kelasLabel } from "@/lib/participant";
import { requiresMixedGender, teamBounds, teamRangeText } from "@/lib/lomba";
import { isComplete, loadCompleteness } from "@/lib/entryOverview";
import { beforeDeadline, fmtDateTime, GENDER_LABEL, isEligible, registrationStatus } from "@/lib/utils";
import { CompIcon } from "@/lib/compIcon";
import type { Competition, EventRow, Participant, Slot } from "@/lib/types";

type CompFull = Competition & { slots: Slot[] };
interface EntryRow {
  id: string;
  team_name: string | null;
  submission_url: string | null;
  ig_username: string | null;
  parent_name: string | null;
  entry_type: "individual" | "team" | null;
  members_note: string | null;
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

  const [evRes, entRes, partRes, memRes, completeMap] = await Promise.all([
    supabase.from("events").select("*").order("created_at").limit(1).maybeSingle(),
    supabase
      .from("entries")
      .select(
        "id, team_name, submission_url, ig_username, parent_name, entry_type, members_note, status, slot_id, slot:competition_slots(label), members:entry_members(participant:participants(*))",
      )
      .eq("competition_id", comp.id)
      .order("created_at"),
    supabase.from("participants").select("*").order("full_name"),
    supabase.from("entry_members").select("participant_id, entry:entries(competition:competitions(name))"),
    loadCompleteness(supabase),
  ]);

  const reg = registrationStatus(evRes.data as EventRow | null);
  const entries = (entRes.data ?? []) as unknown as EntryRow[];
  // Peserta yang sudah terdaftar di lomba mana pun (satu peserta hanya boleh satu lomba).
  const takenIn = new Map<string, string>();
  for (const m of (memRes.data ?? []) as unknown as {
    participant_id: string;
    entry: { competition: { name: string } | null } | null;
  }[]) {
    takenIn.set(m.participant_id, m.entry?.competition?.name ?? "lomba lain");
  }
  // Sesuai metadata lomba: jenjang (levels), kelas SD (grade_min/max), gender (allowed_genders).
  const eligible = ((partRes.data ?? []) as Participant[])
    .filter((p) => isEligible(p, comp))
    .map((p) => ({ ...p, takenIn: takenIn.get(p.id) }));

  const activeEntries = entries.filter((e) => e.status === "registered");
  const filledSlots = new Set(activeEntries.map((e) => e.slot_id));
  const freeSlots = comp.slots.filter((s) => !filledSlots.has(s.id));
  const hasCapacity =
    comp.slots.length > 0
      ? freeSlots.length > 0
      : comp.max_entries_per_village === null || activeEntries.length < comp.max_entries_per_village;

  const mixedGender = requiresMixedGender(comp);
  const quota = comp.slots.length > 0 ? comp.slots.length : comp.max_entries_per_village;
  const canEditUrl = reg.open || beforeDeadline(comp.submission_deadline);
  const isOpen = comp.registration_mode === "open";
  const openComp: OpenComp = {
    id: comp.id,
    name: comp.name,
    slug: comp.slug,
    form_fields: comp.form_fields ?? [],
    allow_team: !!comp.allow_team,
    deadline: comp.submission_deadline ? fmtDateTime(comp.submission_deadline) : null,
    deadlineIso: comp.submission_deadline,
    maxPerVillage: comp.max_entries_per_village,
    note: comp.composition_note,
  };

  return (
    <div className="stack">
      <div className="card">
        <Link className="btn ghost sm" href="/desa/lomba" style={{ marginBottom: 14 }}>
          ← Kembali
        </Link>
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
        <ul className="muted" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          <li>Kategori: {comp.age_label}</li>
          <li>
            {comp.participation_type === "team"
              ? `Regu/tim, ${teamRangeText(comp)}`
              : "Perorangan"}
          </li>
          <li>
            Kuota:{" "}
            {comp.slots.length > 0
              ? `${comp.slots.length} slot per desa (${comp.slots.map((s) => s.label).join(", ")})`
              : comp.max_entries_per_village
                ? `${comp.max_entries_per_village} pendaftaran per desa`
                : "tidak dibatasi"}
            {quota ? (
              <>
                {" "}
                · <b>terisi {comp.slots.length > 0 ? filledSlots.size : activeEntries.length} dari {quota}</b>
              </>
            ) : null}
          </li>
          {comp.submission_deadline && <li>Batas pengumpulan karya: {fmtDateTime(comp.submission_deadline)}</li>}
        </ul>
        {comp.composition_note && <div className="alert info small">📝 {comp.composition_note}</div>}
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
                    {e.entry_type === "team" && <span className="chip">Tim</span>}
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
                {(e.ig_username || e.parent_name || e.members_note) && (
                  <div className="muted small" style={{ marginTop: 6 }}>
                    {[
                      e.parent_name && `Orang tua: ${e.parent_name}`,
                      e.ig_username && `IG: @${e.ig_username}`,
                      e.members_note && `Anggota: ${e.members_note}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {e.members.map((m) => (
                    <li key={m.participant.id}>
                      {displayName(m.participant)}{" "}
                      <span className="muted small">
                        · {GENDER_LABEL[m.participant.gender]} ·{" "}
                        {kelasLabel(m.participant.education_level, m.participant.grade)}
                        {m.participant.age ? ` · ${m.participant.age} th` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                {!isOpen && !isComplete(completeMap, e.id, e.members.length, comp) && (
                  <div className="chip yellow">
                    Anggota belum lengkap ({e.members.length}
                    {teamBounds(comp).min !== null ? ` dari minimal ${teamBounds(comp).min}` : ""})
                  </div>
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
        <h2>{isOpen && /mewarna/i.test(comp.name) ? "Tambah pendaftaran (bisa banyak peserta sekaligus)" : "Tambah pendaftaran"}</h2>
        {!reg.open ? (
          <div className="alert err">Pendaftaran ditutup. {reg.label}</div>
        ) : !hasCapacity ? (
          <div className="alert info">Kuota lomba ini sudah terisi untuk desa Anda.</div>
        ) : isOpen ? (
          <OpenEntryForm comps={[openComp]} fixedCompId={comp.id} action={submitVillageEntries} used={activeEntries.length} />
        ) : (
          <EntryForm
            competitionId={comp.id}
            slots={freeSlots.map((s) => ({ id: s.id, label: s.label, gender: s.gender, level: s.level }))}
            participants={eligible}
            mixedGender={mixedGender}
            compositionNote={comp.composition_note}
            teamSize={comp.team_size}
            teamMinSize={comp.team_min_size ?? null}
            isTeam={comp.participation_type === "team"}
            online={comp.submission_mode === "online"}
          />
        )}
      </div>
    </div>
  );
}
