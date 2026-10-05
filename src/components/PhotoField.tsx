"use client";

import { useEffect, useRef, useState } from "react";
import { fmtBytes, PhotoError, processPhoto, type ProcessedPhoto } from "@/lib/photo";

/**
 * Input foto peserta: validasi, kompres otomatis bila perlu, dan pratinjau.
 * Input file sengaja TANPA atribut name — berkas diunggah langsung ke Storage
 * oleh form induk, bukan ikut dikirim ke server action.
 */
export function PhotoField({
  initialUrl,
  onChange,
  onBusyChange,
}: {
  initialUrl?: string | null;
  onChange: (photo: ProcessedPhoto | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const [preview, setPreview] = useState<{ url: string; photo: ProcessedPhoto } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Bebaskan object URL lama.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  // Form di-reset oleh ActionForm setelah sukses menambah peserta.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      seq.current++;
      setPreview(null);
      setError(null);
      setBusy(false);
      onBusyChange(false);
      onChange(null);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [onChange, onBusyChange]);

  async function pick(file: File | undefined) {
    const mine = ++seq.current;
    setError(null);
    setPreview(null);
    onChange(null);
    if (!file) return;

    setBusy(true);
    onBusyChange(true);
    try {
      const photo = await processPhoto(file);
      if (mine !== seq.current) return;
      setPreview({ url: URL.createObjectURL(photo.blob), photo });
      onChange(photo);
    } catch (e) {
      if (mine !== seq.current) return;
      setError(e instanceof PhotoError ? e.message : "Foto tidak dapat diproses. Coba foto lain.");
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      if (mine === seq.current) {
        setBusy(false);
        onBusyChange(false);
      }
    }
  }

  const shownUrl = preview?.url ?? initialUrl ?? null;

  return (
    <div>
      <label htmlFor="photo">Foto peserta</label>
      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
        {shownUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownUrl}
            alt="Pratinjau foto peserta"
            style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 12, flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            id="photo"
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <p className="muted" style={{ margin: "6px 0 0", fontSize: ".85rem" }}>
            Gunakan foto wajah yang jelas, menghadap kamera, latar sederhana (dipakai untuk video
            pengumuman juara). JPG/PNG/WebP, maks 5 MB.
          </p>
          {busy && <p className="muted" style={{ margin: "6px 0 0" }}>Memproses foto…</p>}
          {preview && (
            <p style={{ margin: "6px 0 0", fontSize: ".85rem" }}>
              <b>
                {fmtBytes(preview.photo.blob.size)} · {preview.photo.width} × {preview.photo.height}
              </b>
              {preview.photo.compressed && (
                <span className="muted"> — dikecilkan otomatis dari {fmtBytes(preview.photo.originalBytes)}</span>
              )}
            </p>
          )}
          {error && <div className="alert err">{error}</div>}
        </div>
      </div>
    </div>
  );
}
