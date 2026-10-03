import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCtx, homeFor } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { login } from "@/app/actions/auth";

export const metadata = { title: "Masuk · FGU 3.0" };

export default async function LoginPage() {
  const { user, profile } = await getCtx();
  if (user && profile) redirect(homeFor(profile.role));

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-side">
          <Image src="/icons/logo-fgu.png" alt="Logo FGU 3.0" width={150} height={150} priority />
          <h1>FGU 3.0</h1>
          <p>
            Portal Festival Generasi Unggulan Bekasi Barat 2026 untuk pendaftaran desa, pengumpulan karya,
            penilaian juri, dan rekap pemenang.
          </p>
          <Link href="/" className="btn white lg" style={{ color: "var(--blue2)" }}>
            ← Kembali ke halaman depan
          </Link>
        </div>
        <div className="login-form">
          <h2>Masuk ke Portal</h2>
          <p className="muted">Gunakan akun yang diberikan panitia.</p>
          <ActionForm action={login}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="contoh: daerah@fgu.id" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <SubmitButton className="btn primary lg login-btn" pendingText="Memeriksa…">
              Login
            </SubmitButton>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
