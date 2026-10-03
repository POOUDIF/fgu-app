import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtScore, registrationStatus } from "@/lib/utils";
import { CompIcon } from "@/lib/compIcon";
import type { Competition, EventRow, Level, Slot, Village } from "@/lib/types";

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

const BEFORE_RULES: [string, string][] = [
  ["⏰", "Hadir 15 menit sebelum lomba"],
  ["⚠️", "Toleransi terlambat 10 menit"],
  ["🚫", "Tidak boleh ikut 2 lomba berbeda"],
  ["👥", "Minimal 2 pendamping/kontingen desa"],
  ["📌", "Boleh peserta di bawah kategori"],
  ["⛔", "Tidak boleh melewati batas usia"],
  ["➖", "Disiplin mengganggu: minus 1/pelanggaran"],
  ["🏛️", "Panitia tidak boleh ikut lomba"],
];
const OTHER_RULES = [
  "Peserta wajib sudah mendaftarkan diri kepada panitia.",
  "Urutan penampilan ditentukan melalui Technical Meeting.",
  "Pemenang yang tidak sesuai kriteria peserta dapat didiskualifikasi.",
  "Keputusan dewan juri pada prinsipnya tidak dapat diganggu gugat, kecuali ada kesalahan panitia.",
  "Periode pendaftaran akan ditentukan panitia.",
];

const AGE_GROUPS: [string, string, string][] = [
  ["PAUD", "Maks. 6 tahun", "Belum duduk di TK."],
  ["TK", "Maks. 6 tahun", "Sedang duduk di TK."],
  ["SD", "Maks. 13 tahun", "Sedang duduk di SD."],
  ["SMP", "Maks. 15 tahun", "Sedang duduk di SMP."],
  ["SMA / Remaja", "Maks. 18 tahun", "Kategori SMA/K."],
  ["Remaja PGM", "Di atas 18 tahun", "Kategori Remaja PGM."],
];

function participantText(c: Competition & { slots: Slot[] }) {
  const g = c.slots.map((x) => x.gender);
  if (c.participation_type === "team" && c.team_size) return `Regu ${c.team_size} orang`;
  if (c.slots.length === 2 && g.includes("L") && g.includes("P")) return "1 putra & 1 putri/desa";
  if (c.participation_type === "team") return "Grup";
  if (c.slots.length > 1) return `${c.slots.length} orang/desa`;
  if (c.allowed_genders?.length === 1) return `Individu ${c.allowed_genders[0] === "L" ? "putra" : "putri"}`;
  return "Individu";
}
const winnerText = (n: number) => (n === 3 ? "Juara 1, 2, 3" : `${n} terbaik`);

const FLOW: [string, string][] = [
  ["Daftar", "Peserta mendaftar kepada panitia sesuai cabang dan kategori usia."],
  ["Technical Meeting", "Urutan penampilan ditentukan oleh panitia."],
  ["Hari H / Pre-Event", "Ikuti metode dan batas pengumpulan masing-masing lomba."],
  ["Penjurian", "Nilai mengikuti kriteria yang tercantum pada juknis."],
];

const SUBMIT_STEPS = ["Pilih lomba", "Isi nama peserta", "Pilih desa", "Tempel link Drive"];

const LEVEL_ORDER: Level[] = ["PAUD", "TK", "SD", "SMP", "SMA", "PGM"];
const LEVEL_LABEL: Record<Level, string> = { PAUD: "PAUD", TK: "TK", SD: "SD", SMP: "SMP", SMA: "SMA/K", PGM: "Remaja PGM" };

function listID(items: string[]) {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")}, dan ${items[items.length - 1]}`;
}
const plainName = (n: string) => n.replace(/^lomba\s+/i, "").toLowerCase();

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
  const levels = new Set(comps.flatMap((c) => c.levels ?? []));
  const lv = LEVEL_ORDER.filter((l) => levels.has(l)).map((l) => LEVEL_LABEL[l]);
  const levelText = lv.length > 1 ? `${lv.slice(0, -1).join(", ")} hingga ${lv[lv.length - 1]}` : lv[0] ?? "";
  const regText =
    ev?.registration_opens_at && ev?.registration_closes_at
      ? `${fmtDate(ev.registration_opens_at)} – ${fmtDate(ev.registration_closes_at)}`
      : "Tanggal akan ditentukan";
  const schedule: [string, string][] = [
    ["Pendaftaran", regText],
    ["Pre-Event", "Online • sesuai ketentuan lomba"],
    ["Technical Meeting", "Urutan tampil ditentukan panitia"],
    ["Hari H", ev?.event_date ? fmtDate(ev.event_date) : "Tanggal akan ditentukan"],
  ];
  const onlineCount = comps.filter((c) => c.submission_mode === "online").length;
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
                <a className="btn primary lg" href="#lomba">
                  Jelajahi {comps.length} Lomba
                </a>
                <a className="btn white lg" href="#juknis">
                  Baca Juknis Ringkas
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
                  <b>{levels.size}</b>
                  <span>Kelompok usia</span>
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
        <section id="tentang" className="about" style={{ scrollMarginTop: 90 }}>
          <span className="eyebrow">Tentang FGU 3.0</span>
          <h2 className="about-title">Festival untuk generus segala usia.</h2>
          <p className="about-text">
            {content.about ??
              "FGU (Festival Generasi Unggulan) 3.0 merupakan rangkaian kegiatan kompetisi dan pembinaan generasi muda di wilayah Bekasi Barat."}{" "}
            Platform ini digunakan untuk pendaftaran peserta, pengumpulan karya, penilaian juri, sampai
            pengumuman pemenang.
          </p>
          <div className="hero-info">
            <div className="hero-card">
              <span className="ico">🎯</span>
              <h3>{villages.length} Desa</h3>
              <p>{listID(villages.map((v) => v.name))}.</p>
            </div>
            <div className="hero-card">
              <span className="ico">👧</span>
              <h3>Beragam Usia</h3>
              <p>
                {levelText
                  ? `${levelText} sesuai kategori tiap lomba.`
                  : "Dari anak usia dini hingga remaja sesuai kategori tiap lomba."}
              </p>
            </div>
            <div className="hero-card">
              <span className="ico">🏅</span>
              <h3>{comps.length} Cabang Lomba</h3>
              <p>
                {comps.length > 1
                  ? `Dari ${plainName(comps[0].name)} hingga ${plainName(comps[comps.length - 1].name)}, seluruh teknis diringkas di halaman ini.`
                  : "Seluruh teknis diringkas di halaman ini."}
              </p>
            </div>
          </div>
        </section>

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
        </section>

        <section id="kategori" className="about" style={{ scrollMarginTop: 90 }}>
          <span className="eyebrow">Kategori usia</span>
          <h2 className="about-title">Kenali kelompok peserta</h2>
          <div className="hero-info">
            {AGE_GROUPS.map(([name, limit, note]) => (
              <div key={name} className="hero-card age-card">
                <span className="age-name">{name}</span>
                <b>{limit}</b>
                <p>{note}</p>
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
          <div className="lomba-grid">
            {comps.map((c) => {
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
                  </ul>
                  <div className="lomba-foot">
                    <span className="chip yellow">{c.cluster ?? "Lomba"}</span>
                    <span className="lomba-btn">Lihat Juknis</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="kontingen" className="about" style={{ scrollMarginTop: 90 }}>
          <span className="eyebrow">Kontingen</span>
          <h2 className="about-title">{villages.length} Desa se-Daerah Bekasi Barat</h2>
          <p className="about-text">Desa-desa yang berpartisipasi dalam FGU 3.0.</p>
          <div className="hero-info">
            {villages.map((v, i) => (
              <div key={v.id} className="hero-card village-card">
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <b>{v.name}</b>
                  <span>Kontingen FGU 3.0</span>
                </div>
              </div>
            ))}
          </div>
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

        <section id="jadwal" className="about" style={{ scrollMarginTop: 90 }}>
          <span className="eyebrow">Waktu &amp; Tempat</span>
          <h2 className="about-title">Catat jadwal utama.</h2>
          <div className="schedule-grid">
            <div className="rules-main schedule-main">
              <h3>
                {weekday && ev?.event_date ? `${weekday}, ${fmtDate(ev.event_date)}` : "Jadwal akan diumumkan"}
              </h3>
              <p>
                07.00 WIB – selesai
                <br />
                <b>{ev?.venue ?? "Tempat akan diumumkan"}</b>
              </p>
              <p>
                Tema acara: <b>{ev?.theme ?? "akan diumumkan menyusul"}.</b>
              </p>
            </div>
            <div className="schedule-list">
              {schedule.map(([label, value]) => (
                <div key={label} className="schedule-row">
                  <b>{label}</b>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {onlineCount > 0 && (
          <section id="pengumpulan" className="about" style={{ scrollMarginTop: 90 }}>
            <span className="eyebrow">Pengumpulan video</span>
            <h2 className="about-title">Kumpulkan Video Lomba</h2>
            <p className="about-text">
              Fitur ini hanya tersedia untuk lomba yang diatur panitia dengan metode pengumpulan{" "}
              <b>Bebas</b>. Pilih lomba, isi nama dan desa, lalu kirim link Google Drive.
            </p>
            <div className="schedule-grid">
              <div className="rules-main schedule-main">
                <h3>📹 Kirim Karya</h3>
                <p>
                  Pastikan link Google Drive dapat diakses panitia. Data akan masuk ke rekap pengumpulan
                  lomba yang bersangkutan.
                </p>
                <Link href="/login" className="btn white lg" style={{ color: "var(--blue2)" }}>
                  Kumpulkan Video Sekarang
                </Link>
              </div>
              <div className="hero-card submit-steps">
                <h3>Alur Pengumpulan</h3>
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
          </section>
        )}

        <section id="pengumuman" className="about" style={{ scrollMarginTop: 90 }}>
          <span className="eyebrow">Pengumuman</span>
          <h2 className="about-title">Info resmi panitia</h2>
          <div className="hero-card announce-card">
            <p>
              {content.announcement ??
                "Belum ada pengumuman. Informasi resmi dari panitia akan tampil di sini."}
            </p>
          </div>
        </section>

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
