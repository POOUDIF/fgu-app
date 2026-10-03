import { addSheet, createWorkbook, SCORE_FMT, type ExcelColumn, type ExcelRow } from "@/lib/excel";
import { authorizeExport, fetchAll, jsonError, xlsxResponse } from "@/lib/exportGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface Result {
  entry_id: string;
  competition_id: string;
  village_name: string;
  slot_label: string | null;
  ranking_group: string | null;
  entry_label: string | null;
  avg_total: number | string | null;
  penalty: number | string | null;
  final_score: number | string | null;
  rank_in_group: number;
}
interface Detail {
  competition_id: string;
  competition_name: string;
  village_name: string;
  entry_id: string;
  entry_label: string | null;
  judge_name: string | null;
  criterion_group: string | null;
  criterion_name: string;
  criterion_order: number;
  weight: number | string | null;
  max_score: number | string | null;
  score: number | string | null;
  weighted_part: number | string | null;
  scored_at: string | null;
}
interface Audit {
  changed_at: string;
  action: "edit" | "reset_judge";
  competition_name: string;
  village_name: string | null;
  entry_label: string | null;
  judge_name: string | null;
  criterion_name: string | null;
  old_score: number | string | null;
  new_score: number | string | null;
  reason: string | null;
  changed_by_name: string | null;
}
interface Submission {
  entry_id: string;
  judge_name: string | null;
  total: number | string | null;
}

const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));

export async function GET() {
  const auth = await authorizeExport();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const [compsRes, results, subs, entries, details, audit] = await Promise.all([
      supabase.from("competitions").select("id,name,results_published,winner_count").order("sort_order"),
      fetchAll<Result>((from, to) =>
        supabase
          .from("entry_results")
          .select(
            "entry_id,competition_id,village_name,slot_label,ranking_group,entry_label,avg_total,penalty,final_score,rank_in_group",
          )
          .order("entry_id")
          .range(from, to),
      ),
      fetchAll<Submission>((from, to) =>
        supabase.from("live_submissions").select("entry_id,judge_name,total").order("entry_id").range(from, to),
      ),
      fetchAll<{ competition_id: string }>((from, to) =>
        supabase.from("entries").select("competition_id").eq("status", "registered").order("id").range(from, to),
      ),
      fetchAll<Detail>((from, to) =>
        supabase
          .from("score_details")
          .select(
            "competition_id,competition_name,village_name,entry_id,entry_label,judge_name,criterion_group,criterion_name,criterion_order,weight,max_score,score,weighted_part,scored_at",
          )
          .order("score_id")
          .range(from, to),
      ),
      fetchAll<Audit>((from, to) =>
        supabase
          .from("score_audit_log")
          .select(
            "changed_at,action,competition_name,village_name,entry_label,judge_name,criterion_name,old_score,new_score,reason,changed_by_name",
          )
          .order("changed_at", { ascending: false })
          .range(from, to),
      ),
    ]);
    if (compsRes.error) throw new Error(compsRes.error.message);
    const comps = compsRes.data ?? [];

    const regCount = new Map<string, number>();
    for (const e of entries) regCount.set(e.competition_id, (regCount.get(e.competition_id) ?? 0) + 1);

    // Pivot nilai juri per pendaftaran.
    const scoreByEntry = new Map<string, Map<string, number | null>>();
    for (const s of subs) {
      const judge = s.judge_name || "(tanpa nama)";
      const m = scoreByEntry.get(s.entry_id) ?? new Map<string, number | null>();
      m.set(judge, num(s.total));
      scoreByEntry.set(s.entry_id, m);
    }

    const wb = createWorkbook();
    const byComp = new Map<string, Result[]>();
    for (const r of results) byComp.set(r.competition_id, [...(byComp.get(r.competition_id) ?? []), r]);

    addSheet(
      wb,
      "Ringkasan",
      [
        { header: "Lomba", key: "lomba" },
        { header: "Jumlah pendaftaran", key: "reg" },
        { header: "Sudah dinilai", key: "dinilai" },
        { header: "Status publikasi", key: "pub" },
        { header: "Jumlah pemenang", key: "win" },
      ],
      comps.map((c) => ({
        lomba: c.name,
        reg: regCount.get(c.id) ?? 0,
        dinilai: byComp.get(c.id)?.length ?? 0,
        pub: c.results_published ? "Terpublikasi" : "Belum dipublikasi",
        win: c.winner_count,
      })),
    );

    for (const c of comps) {
      const list = (byComp.get(c.id) ?? []).sort(
        (a, b) =>
          (a.ranking_group ?? "").localeCompare(b.ranking_group ?? "") || a.rank_in_group - b.rank_in_group,
      );
      const judges = [...new Set(list.flatMap((r) => [...(scoreByEntry.get(r.entry_id)?.keys() ?? [])]))].sort((a, b) =>
        a.localeCompare(b),
      );
      const hasGroups = list.some((r) => r.ranking_group);

      const columns: ExcelColumn[] = [
        { header: "Peringkat", key: "rank" },
        ...(hasGroups ? [{ header: "Kelompok", key: "group" }] : []),
        { header: "Desa", key: "desa" },
        { header: "Slot", key: "slot" },
        { header: "Peserta/Tim", key: "label" },
        ...judges.map((j, i) => ({ header: j, key: `j${i}`, numFmt: SCORE_FMT })),
        { header: "Rata-rata juri", key: "avg", numFmt: SCORE_FMT },
        { header: "Pengurangan", key: "pen", numFmt: SCORE_FMT },
        { header: "Nilai Akhir", key: "final", numFmt: SCORE_FMT },
        { header: "Menang?", key: "win" },
      ];
      const rows: ExcelRow[] = list.map((r) => {
        const row: ExcelRow = {
          rank: r.rank_in_group,
          group: r.ranking_group,
          desa: r.village_name,
          slot: r.slot_label,
          label: r.entry_label,
          avg: num(r.avg_total),
          pen: num(r.penalty) ?? 0,
          final: num(r.final_score),
          win: r.rank_in_group <= c.winner_count ? "Ya" : "Tidak",
        };
        judges.forEach((j, i) => (row[`j${i}`] = scoreByEntry.get(r.entry_id)?.get(j) ?? null));
        return row;
      });
      if (list.length === 0) rows.push({ rank: "Belum ada nilai masuk" });
      addSheet(wb, c.name, columns, rows);
    }

    // Sheet rincian per juri per kriteria (semua lomba).
    const compOrder = new Map(comps.map((c, i) => [c.id, i]));
    const rankOf = new Map(results.map((r) => [r.entry_id, r.rank_in_group]));
    const fmtWib = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    });
    details.sort(
      (a, b) =>
        (compOrder.get(a.competition_id) ?? 0) - (compOrder.get(b.competition_id) ?? 0) ||
        (rankOf.get(a.entry_id) ?? 9999) - (rankOf.get(b.entry_id) ?? 9999) ||
        a.entry_id.localeCompare(b.entry_id) ||
        (a.judge_name ?? "").localeCompare(b.judge_name ?? "") ||
        a.criterion_order - b.criterion_order,
    );
    addSheet(
      wb,
      "Rincian Juri",
      [
        { header: "Lomba", key: "lomba" },
        { header: "Desa", key: "desa" },
        { header: "Peserta/Tim", key: "label" },
        { header: "Juri", key: "juri" },
        { header: "Grup Kriteria", key: "grup" },
        { header: "Kriteria", key: "kriteria" },
        { header: "Bobot", key: "bobot", numFmt: SCORE_FMT },
        { header: "Nilai Maks", key: "maks", numFmt: SCORE_FMT },
        { header: "Nilai", key: "nilai", numFmt: SCORE_FMT },
        { header: "Kontribusi", key: "kontribusi", numFmt: SCORE_FMT },
        { header: "Waktu", key: "waktu" },
      ],
      details.map((d) => ({
        lomba: d.competition_name,
        desa: d.village_name,
        label: d.entry_label,
        juri: d.judge_name,
        grup: d.criterion_group,
        kriteria: d.criterion_name,
        bobot: num(d.weight),
        maks: num(d.max_score),
        nilai: num(d.score),
        kontribusi: num(d.weighted_part),
        waktu: d.scored_at ? fmtWib.format(new Date(d.scored_at)) : null,
      })),
    );

    addSheet(
      wb,
      "Riwayat Koreksi",
      [
        { header: "Waktu", key: "waktu" },
        { header: "Aksi", key: "aksi" },
        { header: "Lomba", key: "lomba" },
        { header: "Desa", key: "desa" },
        { header: "Peserta/Tim", key: "label" },
        { header: "Juri", key: "juri" },
        { header: "Kriteria", key: "kriteria" },
        { header: "Nilai Lama", key: "lama", numFmt: SCORE_FMT },
        { header: "Nilai Baru", key: "baru", numFmt: SCORE_FMT },
        { header: "Alasan", key: "alasan" },
        { header: "Oleh", key: "oleh" },
      ],
      audit.map((a) => ({
        waktu: fmtWib.format(new Date(a.changed_at)),
        aksi: a.action === "edit" ? "Koreksi nilai" : "Reset input juri",
        lomba: a.competition_name,
        desa: a.village_name,
        label: a.entry_label,
        juri: a.judge_name,
        kriteria: a.criterion_name,
        lama: num(a.old_score),
        baru: num(a.new_score),
        alasan: a.reason,
        oleh: a.changed_by_name,
      })),
    );

    return await xlsxResponse(wb, "hasil");
  } catch (err) {
    console.error("export hasil gagal:", err);
    return jsonError("Gagal membuat file Excel. Coba lagi.", 500);
  }
}
