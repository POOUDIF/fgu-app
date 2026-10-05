import Image from "next/image";
import Link from "next/link";
import { getCtx, homeFor } from "@/lib/auth";
import { AccountMenu } from "./AccountMenu";
import { ROLE_LABEL } from "@/lib/utils";

export async function Nav() {
  const { profile } = await getCtx();

  return (
    <header className="nav">
      <div className="navin">
        <Link href="/" className="brand">
          <Image className="logo-img" src="/icons/logo-fgu.png" alt="Logo FGU" width={32} height={32} priority />
          <span>
            FGU 3.0
            <small>Festival Generasi Unggul</small>
          </span>
        </Link>
        <nav className="navlinks">
          <Link href="/">Beranda</Link>
          <Link href="/#juknis">Ketentuan</Link>
          <Link href="/#lomba">Lomba</Link>
          <Link href="/#pengumpulan">Kumpulkan Karya</Link>
          {profile && <Link href={homeFor(profile.role)}>Dashboard</Link>}
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
