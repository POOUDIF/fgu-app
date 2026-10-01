import { requireRole } from "@/lib/auth";

export default async function JuriLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("judge");
  return (
    <div className="container page">
      <span className="chip">Juri</span>
      <h1 style={{ marginTop: 6 }}>Halo, {profile.full_name || profile.email || "Juri"}</h1>
      {children}
    </div>
  );
}
