import { requireRole } from "@/lib/auth";
import { SubNav } from "@/components/SubNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("super_admin");
  return (
    <div className="container page">
      <span className="chip">Admin Daerah</span>
      <h1 style={{ marginTop: 6 }}>Panel Panitia</h1>
      <SubNav
        items={[
          { href: "/admin", label: "Dashboard Live", exact: true },
          { href: "/admin/peserta", label: "Peserta & Pendaftaran" },
          { href: "/admin/hasil", label: "Hasil & Publikasi" },
          { href: "/admin/akun", label: "Akun & Juri" },
          { href: "/admin/pengaturan", label: "Pengaturan" },
        ]}
      />
      {children}
    </div>
  );
}
