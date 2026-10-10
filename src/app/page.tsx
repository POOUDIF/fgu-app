import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtDateTime, fmtScore, registrationStatus } from "@/lib/utils";
import { CompIcon, compIcon } from "@/lib/compIcon";
import { teamBounds } from "@/lib/lomba";
import { KISI_KISI } from "@/lib/kisiKisi";
import { PublicRegistration } from "@/components/PublicRegistration";
import type { OpenComp } from "@/lib/openEntry";
import type { Competition, EventRow, Slot, Village } from "@/lib/types";

interface Winner {
  competition_id: string;
  competition_name: string;
  slot_label: string | null;
  ranking_group: string;
  rank_in_group: number;
  village_name: string;
  entry_label: string | null;
  final_score: number;
}

// Nama berkas di public/dokumen (spasi harus di-encode di URL).
const JUKNIS_PDF = `/dokumen/${encodeURIComponent("Juklak Juknis Lomba FGU 3.0.pdf")}`;

const BEFORE_RULES: [string, string][] = [
  ["⏰", "Hadir 15 menit sebelum lomba dimulai"],
  ["⚠️", "Toleransi terlambat 10 menit (ada pengurangan poin)"],
  ["🚫", "Peserta tidak boleh ikut dua lomba berbeda"],
  ["👥", "Setiap desa wajib mengirim 2 pendamping"],
  ["📌", "Boleh peserta dari kategori di bawah lomba"],
  ["⛔", "Tidak boleh melewati batas kategori lomba"],
  ["➖", "Tidak disiplin & mengganggu: minus 1 poin/pelanggaran"],
  ["🏛️", "Panitia tidak boleh ikut lomba"],
];
const OTHER_RULES = [
  "Peserta adalah caberawit, pra remaja, dan remaja dari 9 Desa se-Daerah Bekasi Barat yang sudah mendaftar ke panitia.",
  "Pendaftaran melalui website resmi FGU 3.0; periode pendaftaran akan ditentukan panitia.",
  "Urutan penampilan ditentukan melalui Technical Meeting.",
  "Pemenang yang tidak sesuai kriteria peserta akan didiskualifikasi.",
  "Keputusan dewan juri tidak dapat diganggu gugat, kecuali ada kesalahan panitia yang akan diperbaiki.",
  "Kedisiplinan bukan kriteria penilaian.",
];

function participantText(c: Competition & { slots: Slot[] }) {
  const g = c.slots.map((x) => x.gender);
  if (c.participation_type === "team" && c.team_size) {
    const { min, max } = teamBounds(c);
    return min !== null && min !== max ? `Regu ${min}–${max} orang` : `Regu ${max} orang`;
  }
  if (c.slots.length === 2 && g.includes("L") && g.includes("P")) return "1 putra & 1 putri/desa";
  if (c.participation_type === "team") return "Grup";
  if (c.slots.length > 1) return `${c.slots.length} orang/desa`;
  const only = c.allowed_genders?.length === 1 ? (c.allowed_genders[0] === "L" ? " putra" : " putri") : "";
  const max = c.max_entries_per_village;
  if (max !== null && max > 1) return `Individu${only}, maks. ${max}/desa`;
  if (max === 1) return `Individu${only}, 1/desa`;
  return `Individu${only}`;
}
const winnerText = (n: number) => (n === 3 ? "Juara 1, 2, 3" : `${n} terbaik`);

const FLOW: [string, string][] = [
  ["Daftar", "Admin desa mendaftarkan peserta sesuai kelas. Lomba online dapat didaftarkan langsung tanpa login."],
  ["Technical Meeting", "Urutan penampilan ditentukan oleh panitia."],
  ["Hari H / Pre-Event", "Ikuti metode dan batas pengumpulan masing-masing lomba."],
  ["Penjurian", "Nilai mengikuti kriteria yang tercantum pada juknis."],
];

const SUBMIT_STEPS = ["Pilih lomba online", "Pilih desa", "Isi data peserta (Mewarnai boleh banyak sekaligus)", "Kirim — tanpa login"];

const FIELD_TEXT: Record<string, string> = {
  parent_name: "nama orang tua",
  ig_username: "username Instagram",
  submission_url: "link video/karya",
};
const fieldsText = (c: Competition) => ["nama peserta", ...(c.form_fields ?? []).map((f) => FIELD_TEXT[f])].join(" · ");



export default async function Home() {
  const supabase = await createClient();
  const [evRes, contentRes, compRes, vilRes, winRes] = await Promise.all([
    supabase.from("events").select("*").order("created_at").limit(1).maybeSingle(),
    supabase.from("site_content").select("key,value"),
    supabase
      .from("competitions")
      .select("*, slots:competition_slots(*)")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("villages").select("*").order("sort_order"),
    supabase.from("public_winners").select("*").order("competition_name").order("rank_in_group"),
  ]);

  const ev = evRes.data as EventRow | null;
  const content = Object.fromEntries((contentRes.data ?? []).map((r) => [r.key, r.value as string]));
  const comps = (compRes.data ?? []) as (Competition & { slots: Slot[] })[];
  const villages = (vilRes.data ?? []) as Village[];
  const winners = (winRes.data ?? []) as Winner[];
  const reg = registrationStatus(ev);
  const title = ev?.name ?? "Festival Generasi Unggul 3.0";
  // Kelompokkan lomba menurut cluster; urutan cluster mengikuti sort_order lomba pertamanya.
  const clusters: { name: string; items: (Competition & { slots: Slot[] })[] }[] = [];
  for (const c of comps) {
    const name = c.cluster ?? "Lomba";
    const g = clusters.find((x) => x.name === name);
    if (g) g.items.push(c);
    else clusters.push({ name, items: [c] });
  }
  const onlineCount = comps.filter((c) => c.submission_mode === "online").length;
  const openList = comps.filter((c) => c.registration_mode === "open");
  const openComps: OpenComp[] = openList.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    form_fields: c.form_fields ?? [],
    allow_team: !!c.allow_team,
    deadline: c.submission_deadline ? fmtDateTime(c.submission_deadline) : null,
    deadlineIso: c.submission_deadline,
    maxPerVillage: c.max_entries_per_village,
    note: c.composition_note,
  }));
  const weekday = ev?.event_date
    ? new Date(ev.event_date).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long" })
    : null;

  const byComp = new Map<string, Winner[]>();
  for (const w of winners) byComp.set(w.competition_name, [...(byComp.get(w.competition_name) ?? []), w]);

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="row">
                <span className="hero-pill">🏆 FGU 3.0 • Bekasi Barat • 2026</span>
                <span className={`chip ${reg.open ? "green" : "gray"}`}>
                  {reg.open ? "Pendaftaran dibuka" : "Pendaftaran ditutup"}
                </span>
              </div>
              <h1 className="hero-title">
                {title.split(/(Unggul)/).map((part, i) =>
                  part === "Unggul" ? (
                    <span key={i} className="grad">
                      {part}
                    </span>
                  ) : (
                    part
                  ),
                )}
              </h1>
              <p className="lead">
                {content.tagline ?? "Wadah kreativitas, prestasi, dan generasi unggulan."}
              </p>
              <div className="row" style={{ marginBottom: 26 }}>
                <Link className="btn primary lg" href="/dashboard">
                  Klik Pendaftaran
                </Link>
                <a className="btn primary lg" href="#pengumpulan">
                  Daftar &amp; Kumpulkan Karya
                </a>
              </div>
              <div className="hero-stats">
                <div>
                  <b>{comps.length}</b>
                  <span>Cabang lomba</span>
                </div>
                <div>
                  <b>{villages.length}</b>
                  <span>Desa</span>
                </div>
                <div>
                  <b>{new Set(comps.flatMap((c) => c.levels ?? [])).size}</b>
                  <span>Kategori kelas</span>
                </div>
                <div>
                  <b>{onlineCount}</b>
                  <span>Lomba online</span>
                </div>
              </div>
            </div>
            <div className="hero-logo">
              <div className="hero-logo-circle">
                <Image src="/icons/logo-fgu.png" alt="Logo FGU 3.0" width={420} height={420} priority />
                <span className="hero-pill small">2026 • BEKASI BARAT</span>
              </div>
            </div>
          </div>

          <div className="hero-info">
            <div className="hero-card">
              <span className="ico">📅</span>
              <b>{ev?.event_date ? fmtDate(ev.event_date) : "Segera diumumkan"}</b>
              <span>{weekday ? `${weekday} • 07.00 WIB–selesai` : "Jadwal menyusul"}</span>
            </div>
            <div className="hero-card">
              <span className="ico">📍</span>
              <b>{ev?.venue ?? "Segera diumumkan"}</b>
              <span>Tempat pelaksanaan utama</span>
            </div>
            <div className="hero-card">
              <span className="ico">👥</span>
              <b>{villages.length} Desa</b>
              <span>Se-Daerah Bekasi Barat</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container page">

        <section id="juknis" className="about" style={{ scrollMarginTop: 90 }}>
          <span className="eyebrow">Juklak &amp; Juknis • Ringkas</span>
          <h2 className="about-title">Aturan umum yang wajib diperhatikan</h2>
          <p className="about-text">Disarikan dari regulasi FGU 3.0 tahun 2026.</p>
          <div className="rules-grid">
            <div className="rules-main">
              <h3>Sebelum ikut lomba</h3>
              <div className="rules-list">
                {BEFORE_RULES.map(([icon, text]) => (
                  <div key={text} className="rule">
                    <span aria-hidden>{icon}</span> {text}
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-card rules-other">
              <h3>Ketentuan lainnya</h3>
              <ul>
                {OTHER_RULES.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="juknis-pdf">
            <span className="juknis-pdf-ico" aria-hidden>
              📄
            </span>
            <div>
              <b>Juklak &amp; Juknis Lengkap — Semua Lomba</b>
              <span>
                Dokumen PDF berisi ketentuan umum serta petunjuk teknis, kriteria penilaian, dan perlengkapan
                {comps.length > 0 ? ` ${comps.length}` : ""} cabang lomba.
              </span>
            </div>
            <div className="row">
              <a className="btn primary" href={JUKNIS_PDF} target="_blank" rel="noreferrer">
                Buka PDF
              </a>
              <a className="btn white" href={JUKNIS_PDF} download>
                Unduh
              </a>
            </div>
          </div>

          <div className="kisi">
            <h3 className="kisi-title">Kisi-kisi Lomba</h3>
            <div className="kisi-grid">
              {KISI_KISI.map((k) => (
                <details key={k.title} className="kisi-card">
                  <summary>
                    <span>
                      <b>{k.title}</b>
                      <small>{k.lomba}</small>
                    </span>
                  </summary>
                  <div className="kisi-body">
                    {k.intro.map((t) => (
                      <p key={t}>{t}</p>
                    ))}
                    {k.sections.map((sec) => {
                      const List = sec.numbered ? "ol" : "ul";
                      return (
                        <div key={sec.heading}>
                          <h4>{sec.heading}</h4>
                          <List>
                            {sec.items.map((it) => (
                              <li key={it}>{it}</li>
                            ))}
                          </List>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="kategori" className="about" style={{ scrollMarginTop: 90 }}>
          <span className="eyebrow">Kategori kelas</span>
          <h2 className="about-title">Kenali kelompok peserta</h2>
          <p className="about-text">Pendaftaran peserta berdasarkan kelas; usia tidak menjadi syarat.</p>
          <div className="hero-info">
            {clusters.map((g) => (
              <div key={g.name} className="hero-card age-card">
                <span className="age-name">{g.name}</span>
                <b>{[...new Set(g.items.map((c) => c.age_label))].join(" · ")}</b>
                <p>{g.items.map((c) => c.name).join(", ")}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="lomba" className="about" style={{ scrollMarginTop: 90 }}>
          <span className="eyebrow">{comps.length} Cabang lomba</span>
          <h2 className="about-title">Semua lomba, satu tampilan.</h2>
          <p className="about-text">
            Klik <b>Lihat Juknis</b> untuk membaca aturan, peserta, lokasi, dan kriteria setiap cabang.
          </p>
          {clusters.map((g) => (
            <div key={g.name} className="lomba-cluster">
              <h3 className="lomba-cluster-title">{g.name}</h3>
              <div className="lomba-grid">
                {g.items.map((c) => {
                  const online = c.submission_mode === "online";
                  return (
                    <Link key={c.id} href={`/lomba/${c.slug}`} className="lomba-card">
                      <div className="lomba-top">
                        <CompIcon name={c.name} size={64} />
                        <span className={`mode ${online ? "online" : "offline"}`}>{online ? "Online" : "Offline"}</span>
                      </div>
                      <h3>{c.name}</h3>
                      <ul>
                        <li>👥 {participantText(c)}</li>
                        <li>🎂 {c.age_label}</li>
                        <li>📍 {c.venue ?? "—"}</li>
                        <li>🏆 {winnerText(c.winner_count)}</li>
                        {c.composition_note && <li>📝 {c.composition_note}</li>}
                      </ul>
                      <div className="lomba-foot">
                        <span className={`chip ${c.schedule_type === "pre_event" ? "yellow" : "green"}`}>
                          {c.schedule_type === "pre_event" ? "Pre-Event" : "Hari H"}
                        </span>
                        <span className="lomba-btn">Lihat Juknis</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>


        <section id="alur" className="about" style={{ scrollMarginTop: 90 }}>
          <span className="eyebrow">Alur</span>
          <h2 className="about-title">Dari pendaftaran sampai pelaksanaan.</h2>
          <div className="flow-grid">
            {FLOW.map(([title, text], i) => (
              <div key={title} className="hero-card flow-card">
                <span className="eyebrow">{String(i + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>


        {(openComps.length > 0 || onlineCount > 0) && (
          <section id="pengumpulan" className="about" style={{ scrollMarginTop: 90 }}>
            <span className="eyebrow">Pengumpulan Karya</span>
            <h2 className="about-title">Daftar &amp; Kumpulkan Karya Online</h2>
            <p className="about-text">
              Lomba online dan Mewarnai bisa didaftarkan <b>tanpa login</b>. Pilih lomba, pilih desa, isi data
              peserta, lalu kirim. Lomba Mewarnai boleh diisi banyak peserta sekaligus.
            </p>
            <div className="schedule-grid">
              <div className="rules-main schedule-main">
                <h3>📹 Kirim Karya</h3>
                <p>
                  Pastikan link Google Drive dapat diakses panitia dan akun Instagram tidak digembok. Data
                  masuk ke rekap pendaftaran lomba yang bersangkutan.
                </p>
                {openComps.length > 0 ? (
                  <PublicRegistration comps={openComps} villages={villages} label="Daftar & Kumpulkan Karya" />
                ) : (
                  // Fallback sebelum migrasi fgu_05 dijalankan (belum ada lomba bertanda 'open').
                  <Link href="/login" className="btn white lg" style={{ color: "var(--blue2)" }}>
                    Kumpulkan Karya Sekarang
                  </Link>
                )}
              </div>
              <div className="hero-card submit-steps">
                <h3>Alur Pendaftaran</h3>
                <div className="schedule-list">
                  {SUBMIT_STEPS.map((step, i) => (
                    <div key={step} className="schedule-row">
                      <b>{String(i + 1).padStart(2, "0")}</b>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="open-comp-list">
              {openList.map((c) => (
                <div key={c.id} className="hero-card">
                  <b>
                    {compIcon(c.name)} {c.name}
                  </b>
                  <span>Data: {fieldsText(c)}</span>
                  {c.allow_team && <span>Jenis: Individu atau Tim</span>}
                  {c.submission_deadline && <span>Batas: {fmtDateTime(c.submission_deadline)}</span>}
                </div>
              ))}
            </div>
          </section>
        )}


        <section id="pemenang" style={{ marginTop: 40, scrollMarginTop: 90 }}>
          <h2>Pemenang</h2>
          {byComp.size === 0 ? (
            <div className="card">
              <p className="muted">Pemenang akan diumumkan setelah penilaian selesai.</p>
            </div>
          ) : (
            <div className="grid g2">
              {[...byComp.entries()].map(([name, list]) => (
                <div className="card" key={name}>
                  <h3>{name}</h3>
                  {list.map((w) => (
                    <div className="feeditem" key={w.competition_id + w.ranking_group + w.rank_in_group + w.village_name}>
                      <div className="row">
                        <span className={`rank ${w.rank_in_group <= 3 ? `r${w.rank_in_group}` : ""}`}>
                          {w.rank_in_group}
                        </span>
                        <div>
                          <b>{w.village_name}</b>
                          <div className="muted small">
                            {[w.ranking_group || w.slot_label, w.entry_label].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                      <b>{fmtScore(w.final_score)}</b>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
