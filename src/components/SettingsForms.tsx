"use client";

import { ActionForm, SubmitButton } from "./ActionForm";
import { updateEvent, updateSiteContent } from "@/app/actions/admin";
import type { EventRow } from "@/lib/types";

export function EventForm({
  ev,
  opensLocal,
  closesLocal,
}: {
  ev: EventRow;
  opensLocal: string;
  closesLocal: string;
}) {
  return (
    <ActionForm action={updateEvent}>
      <input type="hidden" name="id" value={ev.id} />
      <div className="fields">
        <div>
          <label htmlFor="name">Nama acara</label>
          <input id="name" name="name" type="text" defaultValue={ev.name} required />
        </div>
        <div>
          <label htmlFor="event_date">Tanggal acara</label>
          <input id="event_date" name="event_date" type="date" defaultValue={ev.event_date ?? ""} />
        </div>
        <div>
          <label htmlFor="venue">Tempat</label>
          <input id="venue" name="venue" type="text" defaultValue={ev.venue ?? ""} />
        </div>
        <div>
          <label htmlFor="registration_opens_at">Pendaftaran dibuka (WIB)</label>
          <input
            id="registration_opens_at"
            name="registration_opens_at"
            type="datetime-local"
            defaultValue={opensLocal}
          />
        </div>
        <div>
          <label htmlFor="registration_closes_at">Pendaftaran ditutup (WIB)</label>
          <input
            id="registration_closes_at"
            name="registration_closes_at"
            type="datetime-local"
            defaultValue={closesLocal}
          />
        </div>
      </div>
      <p className="muted small" style={{ marginTop: 10 }}>
        Kosongkan waktu buka/tutup bila pendaftaran tidak dibatasi waktu. Di luar jadwal, Admin Desa
        tidak dapat menambah atau menghapus pendaftaran.
      </p>
      <SubmitButton>Simpan pengaturan acara</SubmitButton>
    </ActionForm>
  );
}

export function SiteContentForm({ content }: { content: Record<string, string> }) {
  return (
    <ActionForm action={updateSiteContent}>
      <div className="field">
        <label htmlFor="tagline">Tagline</label>
        <input id="tagline" name="tagline" type="text" defaultValue={content.tagline ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="about">Tentang FGU</label>
        <textarea id="about" name="about" defaultValue={content.about ?? ""} />
      </div>
      <div className="field">
        <label htmlFor="announcement">Pengumuman</label>
        <textarea id="announcement" name="announcement" defaultValue={content.announcement ?? ""} />
      </div>
      <SubmitButton>Simpan konten beranda</SubmitButton>
    </ActionForm>
  );
}
