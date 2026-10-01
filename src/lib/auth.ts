import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export async function getCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: (data as Profile | null) ?? null };
}

export function homeFor(role: Role) {
  return role === "super_admin" ? "/admin" : role === "village_admin" ? "/desa" : "/juri";
}

/** Wajib login dengan peran tertentu; selain itu diarahkan. RLS tetap penjaga utama. */
export async function requireRole(role: Role) {
  const ctx = await getCtx();
  if (!ctx.user || !ctx.profile) redirect("/login");
  if (ctx.profile.role !== role) redirect(homeFor(ctx.profile.role));
  return { supabase: ctx.supabase, user: ctx.user, profile: ctx.profile };
}
