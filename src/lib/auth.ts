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

/** Super Admin atau Admin Daerah: boleh masuk area /admin. */
export function isAdmin(role: Role | null | undefined) {
  return role === "super_admin" || role === "regional_admin";
}

/** Hanya Super Admin: koreksi nilai, pengurangan nilai, kelola akun admin. */
export function isSuper(role: Role | null | undefined) {
  return role === "super_admin";
}

export function homeFor(role: Role) {
  return isAdmin(role) ? "/admin" : role === "village_admin" ? "/desa" : "/juri";
}

/** Wajib login dengan peran tertentu; selain itu diarahkan. RLS tetap penjaga utama. */
export async function requireRole(role: Role) {
  const ctx = await getCtx();
  if (!ctx.user || !ctx.profile) redirect("/login");
  if (ctx.profile.role !== role) redirect(homeFor(ctx.profile.role));
  return { supabase: ctx.supabase, user: ctx.user, profile: ctx.profile };
}

/** Wajib login sebagai Super Admin atau Admin Daerah; selain itu diarahkan. */
export async function requireAdmin() {
  const ctx = await getCtx();
  if (!ctx.user || !ctx.profile) redirect("/login");
  if (!isAdmin(ctx.profile.role)) redirect(homeFor(ctx.profile.role));
  return { supabase: ctx.supabase, user: ctx.user, profile: ctx.profile };
}
