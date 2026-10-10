import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createParticipant, deleteParticipant } from "@/app/actions/desa";
import { ParticipantForm } from "@/components/ParticipantForm";
import { DeleteButton } from "@/components/DeleteButton";
import { signedPhotoUrls } from "@/lib/photoUrl";
import { loadLombaOptions } from "@/lib/lombaOptions";
import { displayName, kelasLabel } from "@/lib/participant";
import { GENDER_LABEL } from "@/lib/utils";
import type { Participant } from "@/lib/types";

type Row = Participant & {
  entry_members: { entry: { competition: { name: string } | null } | null }[];
};

export default async function PesertaPage() {
  const { supabase, profile } = await requireRole("village_admin");
  const { data } = await supabase
    .from("participants")
    .select("*, entry_members(entry:entries(competition:competitions(name)))")
    .order("full_name");
  const rows = (data ?? []) as Row[];
  const THUMB = 40;
  const photos = await signedPhotoUrls(supabase, rows.map((p) => p.photo_path), THUMB);
  const lombaOptions = await loadLombaOptions(supabase, profile.village_id!);

  return (
    <div className="stack">
      <div className="card">
        <h2>Tambah peserta</h2>
        <p className="muted">
          Pilih kelas peserta, lalu pilih lomba yang sesuai dengan kelasnya. Satu peserta hanya boleh
          ikut satu lomba.
        </p>
        <ParticipantForm
          action={createParticipant}
          villageId={profile.village_id!}
          submitLabel="Tambah peserta"
          lombaOptions={lombaOptions}
          resetOnSuccess
        />
      </div>

      <div className="card">
        <h2>Daftar peserta ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="muted">Belum ada peserta.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Nama</th>
                  <th>L/P</th>
                  <th>Kelas</th>
                  <th>Terdaftar di</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const comps = p.entry_members
                    .map((m) => m.entry?.competition?.name)
                    .filter(Boolean) as string[];
                  return (
                    <tr key={p.id}>
                      <td>
                        {p.photo_path && photos[p.photo_path] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photos[p.photo_path]}
                            alt={`Foto ${p.full_name}`}
                            loading="lazy"
                            decoding="async"
                            width={THUMB}
                            height={THUMB}
                            style={{ width: THUMB, height: THUMB, objectFit: "cover", borderRadius: 8 }}
                          />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <b>{displayName(p)}</b>
                      </td>
                      <td>{GENDER_LABEL[p.gender]}</td>
                      <td>
                        {kelasLabel(p.education_level, p.grade)}
                      </td>
                      <td>
                        {comps.length ? (
                          comps.map((n) => (
                            <span key={n} className="chip green">
                              {n}
                            </span>
                          ))
                        ) : (
                          <span className="muted">Belum</span>
                        )}
                      </td>
                      <td>
                        <div className="row" style={{ justifyContent: "flex-end" }}>
                          <Link className="btn soft sm" href={`/desa/peserta/${p.id}`}>
                            Ubah
                          </Link>
                          <DeleteButton
                            action={deleteParticipant}
                            id={p.id}
                            confirm={`Hapus peserta ${displayName(p)}?`}
                          />
                        </div>
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
