import type { SupabaseClient } from "@supabase/supabase-js";
import { PHOTO_BUCKET } from "./photo";

const TTL = 60 * 60; // detik

/**
 * Signed URL foto peserta, kunci = photo_path.
 *
 * Thumbnail lewat Storage image transformation hanya dipakai bila
 * SUPABASE_IMAGE_TRANSFORM=1 (fitur plan Pro). Tanpa itu, dipakai signed URL biasa
 * dan ukuran kecil diatur lewat CSS + loading="lazy" di sisi tampilan.
 */
export async function signedPhotoUrls(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
  thumb?: number,
) {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const out: Record<string, string> = {};
  if (unique.length === 0) return out;

  const bucket = supabase.storage.from(PHOTO_BUCKET);
  if (thumb && process.env.SUPABASE_IMAGE_TRANSFORM === "1") {
    await Promise.all(
      unique.map(async (p) => {
        const { data } = await bucket.createSignedUrl(p, TTL, {
          transform: { width: thumb * 2, height: thumb * 2, resize: "cover", quality: 70 },
        });
        if (data) out[p] = data.signedUrl;
      }),
    );
  } else {
    const { data } = await bucket.createSignedUrls(unique, TTL);
    for (const r of data ?? []) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  }
  return out;
}
