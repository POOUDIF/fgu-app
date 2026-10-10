import Image from "next/image";
import Link from "next/link";
import { getCtx, homeFor } from "@/lib/auth";
import { AccountMenu } from "./AccountMenu";
import { MobileMenu, type MenuLink } from "./MobileMenu";
import { ROLE_LABEL } from "@/lib/utils";

export async function Nav() {
  const { profile } = await getCtx();

  const links: MenuLink[] = [
    { href: "/", label: "Beranda", icon: "home" },
    { href: "/#juknis", label: "Ketentuan", icon: "info" },
    { href: "/#lomba", label: "Lomba", icon: "trophy" },
    { href: "/#pengumpulan", label: "Kumpulkan Karya", icon: "upload" },
    ...(profile ? [{ href: homeFor(profile.role), label: "Dashboard", icon: "grid" as const }] : []),
  ];

  return (
    <header className="nav">
      <div className="navin">
        <MobileMenu links={links} />
        <Link href="/" className="brand">
          <Image className="logo-img" src="/icons/logo-fgu.png" alt="Logo FGU" width={32} height={32} priority />
          <span>
            FGU 3.0
            <small>Festival Generasi Unggul</small>
          </span>
        </Link>
        <nav className="navlinks">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        {/* Di luar .navlinks agar dropdown tidak terpotong oleh overflow area menu */}
        {profile ? (
          <AccountMenu name={profile.full_name || profile.email || "Akun"} roleLabel={ROLE_LABEL[profile.role]} />
        ) : (
          <Link href="/login" className="nav-login">
            Login Portal
          </Link>
        )}
      </div>
    </header>
  );
}
