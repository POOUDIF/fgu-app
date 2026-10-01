import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { updateParticipant } from "@/app/actions/desa";
import { ParticipantForm } from "@/components/ParticipantForm";
import type { Participant } from "@/lib/types";

export default async function UbahPesertaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("village_admin");
  const { data } = await supabase.from("participants").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

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
        initial={data as Participant}
        submitLabel="Simpan perubahan"
      />
    </div>
  );
}
