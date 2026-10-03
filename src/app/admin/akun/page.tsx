import { isSuper, requireAdmin } from "@/lib/auth";
import { AccountActions, CreateAccountDialog, JudgeAssignForm, ProfileForm } from "@/components/AdminForms";
import { ROLE_LABEL } from "@/lib/utils";
import type { Profile, Village } from "@/lib/types";

export default async function AdminAkun() {
  const { supabase, user, profile: me } = await requireAdmin();
  const superAdmin = isSuper(me.role);

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
      <div className="card">
        <CreateAccountDialog
          villages={villages.map((v) => ({ id: v.id, name: v.name }))}
          competitions={comps}
          canCreateRegional={superAdmin}
        />
        <p className="muted small">{profiles.length} akun terdaftar.</p>
        <div className="stack">
          {profiles.map((p) => {
            // Admin Daerah tidak boleh mengelola akun Super Admin / Admin Daerah.
            const locked = !superAdmin && (p.role === "super_admin" || p.role === "regional_admin");
            return (
              <div key={p.id} className="card" style={{ boxShadow: "none" }}>
                {locked ? (
                  <div>
                    <b>{p.full_name || p.email}</b>{" "}
                    <span className="chip gray">{ROLE_LABEL[p.role]}</span>
                    <div className="muted small">{p.email}</div>
                  </div>
                ) : (
                  <>
                    <ProfileForm
                      profile={p}
                      villages={villages.map((v) => ({ id: v.id, name: v.name }))}
                      isSelf={p.id === user.id}
                      canAssignAdmin={superAdmin}
                    />
                    <AccountActions profile={p} isSelf={p.id === user.id} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h2>Penugasan juri</h2>
        {judges.length === 0 ? (
          <p className="muted">
            Belum ada akun berperan Juri. Buat akun Juri dengan tombol “Buat Akun” di atas.
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
