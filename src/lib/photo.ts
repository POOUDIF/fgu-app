/**
 * Foto peserta — dipakai untuk video tron pengumuman juara, jadi kualitas dijaga.
 * Validasi + kompresi di browser (modul ini hanya boleh dipanggil dari client).
 */

export const PHOTO_BUCKET = "participant-photos";
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // sama dengan batas bucket
export const PHOTO_MAX_SIDE = 2560;
const QUALITY_STEPS = [0.9, 0.8, 0.7];

const EXT_BY_TYPE = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type PhotoType = keyof typeof EXT_BY_TYPE;
export type PhotoExt = (typeof EXT_BY_TYPE)[PhotoType];

export interface ProcessedPhoto {
  blob: Blob;
  type: PhotoType;
  ext: PhotoExt;
  width: number;
  height: number;
  originalBytes: number;
  /** true bila foto dikecilkan/dikompres otomatis. */
  compressed: boolean;
}

export class PhotoError extends Error {}

export function fmtBytes(n: number) {
  const mb = n / (1024 * 1024);
  if (mb >= 1) return `${mb.toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(n / 1024)).toLocaleString("id-ID")} KB`;
}

function isHeic(file: File) {
  return /^image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  // "from-image": orientasi EXIF diterapkan, sehingga width/height sudah sesuai tampilan.
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    // Fallback untuk browser tanpa createImageBitmap(file, opsi); <img> juga menghormati EXIF.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return {
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        close: () => URL.revokeObjectURL(url),
      };
    } catch {
      URL.revokeObjectURL(url);
      throw new PhotoError("Foto tidak dapat dibaca. Coba foto lain.");
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function render(
  d: { source: CanvasImageSource; width: number; height: number },
  w: number,
  h: number,
  whiteBg: boolean,
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("Browser tidak mendukung pemrosesan foto.");
  ctx.imageSmoothingQuality = "high";
  if (whiteBg) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(d.source, 0, 0, w, h);
  return canvas;
}

/** Validasi + (bila perlu) kompres. Melempar PhotoError dengan pesan ramah. */
export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  if (isHeic(file)) throw new PhotoError("Format HEIC tidak didukung. Ubah ke JPG/PNG dulu.");
  if (!(file.type in EXT_BY_TYPE))
    throw new PhotoError("Format foto harus JPG, PNG, atau WebP.");
  if (file.size === 0) throw new PhotoError("File foto kosong. Coba foto lain.");

  const type = file.type as PhotoType;
  const d = await decode(file);
  try {
    const longest = Math.max(d.width, d.height);
    if (file.size <= PHOTO_MAX_BYTES && longest <= PHOTO_MAX_SIDE) {
      // Sudah memenuhi batas: unggah apa adanya, tanpa kompres ulang.
      return {
        blob: file,
        type,
        ext: EXT_BY_TYPE[type],
        width: d.width,
        height: d.height,
        originalBytes: file.size,
        compressed: false,
      };
    }

    const scale = Math.min(1, PHOTO_MAX_SIDE / longest);
    const w = Math.round(d.width * scale);
    const h = Math.round(d.height * scale);

    let canvas = render(d, w, h, false);
    let outType: PhotoType = "image/webp";
    for (const q of QUALITY_STEPS) {
      let blob = await toBlob(canvas, outType, q);
      if (blob && blob.type !== outType && outType === "image/webp") {
        // Browser tidak bisa menyandi WebP (mis. Safari lama): pakai JPEG di latar putih.
        outType = "image/jpeg";
        canvas = render(d, w, h, true);
        blob = await toBlob(canvas, outType, q);
      }
      if (blob && blob.size <= PHOTO_MAX_BYTES) {
        return {
          blob,
          type: outType,
          ext: EXT_BY_TYPE[outType],
          width: w,
          height: h,
          originalBytes: file.size,
          compressed: true,
        };
      }
    }
    throw new PhotoError("Foto terlalu besar, gunakan foto lain.");
  } finally {
    d.close();
  }
}
