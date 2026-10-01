import { requireRole } from "@/lib/auth";
import { SubNav } from "@/components/SubNav";

export default async function DesaLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireRole("village_admin");

  if (!profile.village_id) {
    return (
      <div className="container page">
        <div className="alert err">
          Akun Anda belum dihubungkan ke desa. Hubungi Admin Daerah.
        </div>
      </div>
    );
  }

  const { data: village } = await supabase
    .from("villages")
    .select("name")
    .eq("id", profile.village_id)
    .maybeSingle();

  return (
    <div className="container page">
      <div className="row between" style={{ marginBottom: 14 }}>
        <div>
          <span className="chip">Admin Desa</span>
          <h1 style={{ marginTop: 6 }}>Kontingen {village?.name ?? "—"}</h1>
        </div>
      </div>
      <SubNav
        items={[
          { href: "/desa", label: "Ringkasan", exact: true },
          { href: "/desa/peserta", label: "Peserta" },
          { href: "/desa/lomba", label: "Pendaftaran Lomba" },
          { href: "/desa/hasil", label: "Hasil" },
        ]}
      />
      {children}
    </div>
  );
}
