import { requireRole } from "@/lib/auth";
import { PortalShell } from "@/components/PortalShell";

export default async function DesaLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireRole("village_admin");

  if (!profile.village_id) {
    return (
      <div className="container page">
        <div className="alert err">
          Akun Anda belum dihubungkan ke desa. Hubungi panitia.
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
    <PortalShell
      badge="Admin Desa"
      title={`Kontingen ${village?.name ?? "—"}`}
      items={[
        { href: "/desa", label: "Ringkasan", icon: "home", exact: true },
        { href: "/desa/peserta", label: "Pendaftaran Peserta", icon: "user" },
        { href: "/desa/hasil", label: "Hasil", icon: "trophy" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
