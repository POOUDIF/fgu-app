import { createClient } from "@supabase/supabase-js";

/** Klien tanpa sesi (peran `anon`) untuk aksi publik, mis. pendaftaran lomba tanpa login. */
export function createAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
