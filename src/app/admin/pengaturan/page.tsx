import { requireRole } from "@/lib/auth";
import { EventForm, SiteContentForm } from "@/components/SettingsForms";
import { registrationStatus, toLocalInput } from "@/lib/utils";
import type { EventRow } from "@/lib/types";

export default async function AdminPengaturan() {
  const { supabase } = await requireRole("super_admin");
  const [evRes, contentRes] = await Promise.all([
    supabase.from("events").select("*").order("created_at").limit(1).maybeSingle(),
    supabase.from("site_content").select("key,value"),
  ]);
  const ev = evRes.data as EventRow | null;
  const content = Object.fromEntries((contentRes.data ?? []).map((r) => [r.key, r.value]));
  const reg = registrationStatus(ev);

  return (
    <div className="stack">
      <div className="card">
        <h2>Acara &amp; jadwal pendaftaran</h2>
        {ev ? (
          <>
            <div className={`alert ${reg.open ? "ok" : "err"}`}>
              Status pendaftaran saat ini: <b>{reg.open ? "Dibuka" : "Ditutup"}</b> · {reg.label}
            </div>
            <EventForm
              ev={ev}
              opensLocal={toLocalInput(ev.registration_opens_at)}
              closesLocal={toLocalInput(ev.registration_closes_at)}
            />
          </>
        ) : (
          <div className="alert err">Data acara belum ada. Jalankan fgu_02_seed.sql.</div>
        )}
      </div>

      <div className="card">
        <h2>Konten beranda</h2>
        <SiteContentForm content={content} />
      </div>
    </div>
  );
}
