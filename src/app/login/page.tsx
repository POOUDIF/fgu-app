import { redirect } from "next/navigation";
import { getCtx, homeFor } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { login } from "@/app/actions/auth";

export const metadata = { title: "Masuk · FGU 3.0" };

export default async function LoginPage() {
  const { user, profile } = await getCtx();
  if (user && profile) redirect(homeFor(profile.role));

  return (
    <div className="container">
      <div className="card login">
        <h1 style={{ fontSize: "1.6rem" }}>Masuk</h1>
        <p className="muted">
          Untuk Admin Daerah, Admin Desa, dan Juri. Akun dibuat oleh panitia.
        </p>
        <ActionForm action={login}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Kata sandi</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton pendingText="Memeriksa…">Masuk</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
