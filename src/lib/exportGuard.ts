import type { SupabaseClient } from "@supabase/supabase-js";
import type ExcelJS from "exceljs";
import { getCtx, isAdmin } from "@/lib/auth";

const MIN_INTERVAL_MS = 3000;
const PAGE_SIZE = 1000;
// Rate limit sederhana per instance server; cukup untuk mencegah klik beruntun.
const lastExport = new Map<string, number>();

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Hanya Super Admin & Admin Daerah; mengembalikan klien sesi (RLS tetap berlaku) atau Response error. */
export async function authorizeExport(): Promise<{ supabase: SupabaseClient } | { error: Response }> {
  const { supabase, user, profile } = await getCtx();
  if (!user || !profile) return { error: jsonError("Silakan login terlebih dahulu.", 401) };
  if (!isAdmin(profile.role)) return { error: jsonError("Anda tidak berhak mengekspor data ini.", 403) };

  const now = Date.now();
  const last = lastExport.get(user.id) ?? 0;
  if (now - last < MIN_INTERVAL_MS) return { error: jsonError("Terlalu cepat. Coba lagi beberapa detik lagi.", 429) };
  lastExport.set(user.id, now);
  if (lastExport.size > 200) {
    for (const [k, t] of lastExport) if (now - t > MIN_INTERVAL_MS) lastExport.delete(k);
  }
  return { supabase };
}

/** Ambil semua baris; PostgREST membatasi 1000 baris/request. Query wajib punya urutan stabil. */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) return out;
  }
}

/** Tanggal hari ini (YYYY-MM-DD) zona Asia/Jakarta. */
export function jakartaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export async function xlsxResponse(wb: ExcelJS.Workbook, prefix: string) {
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="FGU3-${prefix}-${jakartaDate()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
