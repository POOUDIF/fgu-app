import { redirect } from "next/navigation";
import { getCtx, homeFor } from "@/lib/auth";

export default async function DashboardRedirect() {
  const { user, profile } = await getCtx();
  if (!user) redirect("/login");
  if (profile) redirect(homeFor(profile.role));

  return (
    <div className="container page">
      <div className="card">
        <h2>Profil belum tersedia</h2>
        <p className="muted">
          Akun Anda sudah login tetapi belum memiliki profil. Hubungi panitia.
        </p>
        <form action="/auth/signout" method="post">
          <button className="btn ghost" type="submit">
            Keluar
          </button>
        </form>
      </div>
    </div>
  );
}
