import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtScore, registrationStatus } from "@/lib/utils";
import type { Competition, EventRow, Village } from "@/lib/types";

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

export default async function Home() {
  const supabase = await createClient();
  const [evRes, contentRes, compRes, vilRes, winRes] = await Promise.all([
    supabase.from("events").select("*").order("created_at").limit(1).maybeSingle(),
    supabase.from("site_content").select("key,value"),
    supabase.from("competitions").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("villages").select("*").order("sort_order"),
    supabase.from("public_winners").select("*").order("competition_name").order("rank_in_group"),
  ]);

  const ev = evRes.data as EventRow | null;
  const content = Object.fromEntries((contentRes.data ?? []).map((r) => [r.key, r.value as string]));
  const comps = (compRes.data ?? []) as Competition[];
  const villages = (vilRes.data ?? []) as Village[];
  const winners = (winRes.data ?? []) as Winner[];
  const reg = registrationStatus(ev);

  const byComp = new Map<string, Winner[]>();
  for (const w of winners) byComp.set(w.competition_name, [...(byComp.get(w.competition_name) ?? []), w]);

  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="chip green">{reg.open ? "Pendaftaran dibuka" : "Pendaftaran ditutup"}</span>
          <h1 style={{ marginTop: 12 }}>{ev?.name ?? "Festival Generasi Unggul 3.0"}</h1>
          <p className="lead">
            {content.tagline ?? "Wadah kreativitas, prestasi, dan generasi unggulan."}
          </p>
          <div className="row" style={{ marginBottom: 18 }}>
            {ev?.event_date && <span className="chip">📅 {fmtDate(ev.event_date)}</span>}
            {ev?.venue && <span className="chip">📍 {ev.venue}</span>}
            <span className="chip">{comps.length} cabang lomba</span>
            <span className="chip">{villages.length} desa</span>
          </div>
          <div className="row">
            <Link className="btn primary" href="/login">
              Masuk panitia / desa / juri
            </Link>
            <a className="btn ghost" href="#lomba">
              Lihat lomba
            </a>
          </div>
        </div>
      </section>

      <div className="container page">
        {content.announcement && <div className="alert info">📢 {content.announcement}</div>}
        {content.about && (
          <section className="card" style={{ marginTop: 16 }}>
            <h2>Tentang FGU</h2>
            <p>{content.about}</p>
          </section>
        )}

        <section id="lomba" style={{ marginTop: 32, scrollMarginTop: 90 }}>
          <h2>Cabang lomba</h2>
          <div className="grid g3">
            {comps.map((c) => (
              <Link key={c.id} href={`/lomba/${c.slug}`} className="card comp">
                <div className="row">
                  <span className="chip">{c.cluster ?? "Lomba"}</span>
                  {c.submission_mode === "online" && <span className="chip yellow">Online</span>}
                  {c.results_published && <span className="chip green">Hasil tersedia</span>}
                </div>
                <h3>{c.name}</h3>
                <div className="muted small">{c.age_label}</div>
                <div className="muted small">
                  {c.participation_type === "team" ? "Regu/tim" : "Perorangan"}
                  {c.venue ? ` · ${c.venue}` : ""}
                </div>
              </Link>
            ))}
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

        <section style={{ marginTop: 40 }}>
          <h2>Kontingen desa</h2>
          <div className="row">
            {villages.map((v) => (
              <span className="chip" key={v.id}>
                {v.name}
              </span>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
