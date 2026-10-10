import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { updateParticipant } from "@/app/actions/desa";
import { ParticipantForm } from "@/components/ParticipantForm";
import { loadLombaOptions } from "@/lib/lombaOptions";
import { signedPhotoUrls } from "@/lib/photoUrl";
import type { Participant } from "@/lib/types";

export default async function UbahPesertaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("village_admin");
  const { data } = await supabase.from("participants").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const participant = data as Participant;
  const [lombaOptions, memRes] = await Promise.all([
    loadLombaOptions(supabase, profile.village_id!),
    supabase
      .from("entry_members")
      .select("entry:entries(competition:competitions(id,name))")
      .eq("participant_id", id)
      .maybeSingle(),
  ]);
  const currentLomba =
    (memRes.data as unknown as { entry: { competition: { id: string; name: string } | null } | null } | null)?.entry
      ?.competition ?? null;
  const photoUrl = (await signedPhotoUrls(supabase, [participant.photo_path]))[participant.photo_path ?? ""];

  return (
    <div className="card">
      <div className="row between">
        <h2>Ubah peserta</h2>
        <Link className="btn ghost sm" href="/desa/peserta">
          ← Kembali
        </Link>
      </div>
      <ParticipantForm
        action={updateParticipant}
        initial={participant}
        villageId={profile.village_id!}
        photoUrl={photoUrl}
        lombaOptions={lombaOptions}
        currentLomba={currentLomba}
        submitLabel="Simpan perubahan"
      />
    </div>
  );
}
