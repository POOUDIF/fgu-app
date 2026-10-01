import Link from "next/link";
import { getCtx, homeFor } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/utils";

export async function Nav() {
  const { profile } = await getCtx();

  return (
    <header className="nav">
      <div className="navin">
        <Link href="/" className="brand">
          <span className="logo">FGU</span>
          <span>
            Festival Generasi Unggul
            <small>FGU 3.0 · Bekasi Barat</small>
          </span>
        </Link>
        <nav className="navlinks">
          <Link href="/#lomba">Lomba</Link>
          <Link href="/#pemenang">Pemenang</Link>
          {profile ? (
            <>
              <Link href={homeFor(profile.role)}>Dasbor</Link>
              <span className="who">
                {profile.full_name || profile.email || "Akun"} · {ROLE_LABEL[profile.role]}
              </span>
              <form action="/auth/signout" method="post">
                <button type="submit">Keluar</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn primary">
              Masuk
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
