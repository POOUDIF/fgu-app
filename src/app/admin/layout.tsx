import { requireAdmin } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/utils";
import { PortalShell } from "@/components/PortalShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <PortalShell
      badge={ROLE_LABEL[profile.role]}
      title="Panel Panitia"
      items={[
        { href: "/admin", label: "Dashboard Live", icon: "dashboard", exact: true },
        { href: "/admin/peserta", label: "Peserta & Pendaftaran", icon: "users" },
        { href: "/admin/hasil", label: "Hasil & Publikasi", icon: "trophy" },
        { href: "/admin/akun", label: "Akun & Juri", icon: "key" },
        { href: "/admin/pengaturan", label: "Pengaturan", icon: "settings" },
      ]}
    >
      {children}
    </PortalShell>
  );
}
