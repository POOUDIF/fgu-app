import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtDateTime, fmtScore } from "@/lib/utils";
import type { Competition, Criterion, Slot } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("competitions").select("name").eq("slug", slug).maybeSingle();
  return { title: data ? `${data.name} · FGU 3.0` : "Lomba · FGU 3.0" };
}

export default async function LombaPublik({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("competitions")
    .select("*, slots:competition_slots(*), criteria(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) notFound();

  const c = data as Competition & { slots: Slot[]; criteria: Criterion[] };
  const criteria = [...c.criteria].sort((a, b) => a.sort_order - b.sort_order);
  const groups: { name: string | null; items: Criterion[] }[] = [];
  for (const k of criteria) {
    const g = groups.find((x) => x.name === k.group_name);
    if (g) g.items.push(k);
    else groups.push({ name: k.group_name, items: [k] });
  }
  const placeholder = criteria.some((k) => k.name.includes("menyusul"));

  return (
    <div className="container page">
      <Link className="btn ghost sm" href="/#lomba">
        ← Semua lomba
      </Link>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row">
          <span className="chip">{c.cluster}</span>
          {c.submission_mode === "online" && <span className="chip yellow">Online</span>}
        </div>
        <h1 style={{ marginTop: 8 }}>{c.name}</h1>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            <b>Kategori:</b> {c.age_label}
          </li>
          <li>
            <b>Jenis:</b>{" "}
            {c.participation_type === "team"
              ? `Regu/tim${c.team_size ? ` (${c.team_size} anggota)` : ""}`
              : "Perorangan"}
            {c.composition_note ? ` — ${c.composition_note}` : ""}
          </li>
          {c.venue && (
            <li>
              <b>Tempat:</b> {c.venue}
            </li>
          )}
          {c.slots.length > 0 && (
            <li>
              <b>Slot per desa:</b> {c.slots.map((s) => s.label).join(", ")}
            </li>
          )}
          {c.submission_deadline && (
            <li>
              <b>Batas pengumpulan karya:</b> {fmtDateTime(c.submission_deadline)}
            </li>
          )}
        </ul>
      </div>

      {c.rules.length > 0 && (
        <div className="card">
          <h2>Ketentuan</h2>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {c.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>Kriteria penilaian</h2>
        {placeholder && <div className="alert info">Kriteria rinci akan diumumkan panitia.</div>}
        {groups.map((g) => (
          <div key={g.name ?? "_"} style={{ marginBottom: 12 }}>
            {g.name && <h3>{g.name}</h3>}
            <div className="tablewrap">
              <table>
                <tbody>
                  {g.items.map((k) => (
                    <tr key={k.id}>
                      <td>{k.name}</td>
                      <td className="right nowrap">
                        <b>{c.scoring_method === "points" ? "Poin" : `${fmtScore(k.weight)}%`}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
