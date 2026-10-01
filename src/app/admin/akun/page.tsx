import { requireRole } from "@/lib/auth";
import { JudgeAssignForm, ProfileForm } from "@/components/AdminForms";
import type { Profile, Village } from "@/lib/types";

export default async function AdminAkun() {
  const { supabase, user } = await requireRole("super_admin");

  const [profRes, vilRes, compRes, asgRes] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("villages").select("*").order("sort_order"),
    supabase.from("competitions").select("id,name").order("sort_order"),
    supabase.from("competition_judges").select("*"),
  ]);

  const profiles = (profRes.data ?? []) as Profile[];
  const villages = (vilRes.data ?? []) as Village[];
  const comps = compRes.data ?? [];
  const assigned = new Map<string, string[]>();
  for (const a of asgRes.data ?? [])
    assigned.set(a.judge_id, [...(assigned.get(a.judge_id) ?? []), a.competition_id]);
  const judges = profiles.filter((p) => p.role === "judge");

  return (
    <div className="stack">
      <div className="alert info">
        <b>Membuat akun baru:</b> Supabase Dashboard → Authentication → Users → Add user (isi email
        &amp; kata sandi, centang Auto Confirm). Akun baru otomatis berperan <b>Juri</b> tanpa
        penugasan; ubah perannya di sini. Untuk Admin Desa, pilih desanya.
      </div>

      <div className="card">
        <h2>Akun ({profiles.length})</h2>
        <div className="stack">
          {profiles.map((p) => (
            <div key={p.id} className="card" style={{ boxShadow: "none" }}>
              <ProfileForm
                profile={p}
                villages={villages.map((v) => ({ id: v.id, name: v.name }))}
                isSelf={p.id === user.id}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Penugasan juri</h2>
        {judges.length === 0 ? (
          <p className="muted">
            Belum ada akun berperan Juri. Buat akun lalu atur perannya di atas.
          </p>
        ) : (
          <div className="stack">
            {judges.map((j) => (
              <div key={j.id} className="card" style={{ boxShadow: "none" }}>
                <h3>{j.full_name || j.email || j.id}</h3>
                <JudgeAssignForm
                  judgeId={j.id}
                  competitions={comps}
                  assigned={assigned.get(j.id) ?? []}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
