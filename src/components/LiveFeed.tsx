"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtScore } from "@/lib/utils";

export interface Submission {
  entry_id: string;
  judge_id: string;
  submitted_at: string;
  criteria_count: number;
  total: number;
  competition_name: string;
  village_name: string;
  judge_name: string;
  entry_label: string | null;
}

const key = (s: Submission) => `${s.entry_id}|${s.judge_id}`;
const PAGE_SIZE = 10;

export function LiveFeed({ initial, initialTotal }: { initial: Submission[]; initialTotal: number }) {
  const [rows, setRows] = useState<Submission[]>(initial);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const pageRef = useRef(1);
  const [loading, setLoading] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const known = useRef(new Set(initial.map(key)));

  // Halaman aktif dimuat ulang saat berubah halaman atau ada nilai baru (urut terbaru dulu).
  const loadRef = useRef<(p: number) => Promise<void>>(async () => {});

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function reload(p: number) {
      const from = (p - 1) * PAGE_SIZE;
      const { data, count } = await supabase
        .from("live_submissions")
        .select("*", { count: "exact" })
        .order("submitted_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (!data) return;
      const list = data as Submission[];
      const added = list.filter((r) => !known.current.has(key(r))).map(key);
      list.forEach((r) => known.current.add(key(r)));
      setRows(list);
      if (count !== null) setTotal(count);
      if (added.length) {
        setFresh(new Set(added));
        setTimeout(() => setFresh(new Set()), 2500);
      }
    }

    // satu penilaian = banyak baris scores -> gabungkan lewat debounce
    const channel = supabase
      .channel("live-scores")
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => reload(pageRef.current), 500);
      })
      .subscribe((s) => {
        setStatus(s === "SUBSCRIBED" ? "live" : s === "CLOSED" || s === "CHANNEL_ERROR" ? "offline" : "connecting");
      });

    loadRef.current = reload;
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function go(p: number) {
    const next = Math.min(Math.max(1, p), pages);
    if (next === page || loading) return;
    pageRef.current = next;
    setPage(next);
    setLoading(true);
    await loadRef.current(next);
    setLoading(false);
  }

  return (
    <div>
      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="small muted">
          {status === "live" ? (
            <>
              <span className="dot" /> Live — nilai baru muncul otomatis
            </>
          ) : status === "connecting" ? (
            "Menghubungkan…"
          ) : (
            "Koneksi live terputus — muat ulang halaman"
          )}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="muted">Belum ada penilaian masuk.</p>
      ) : (
        <div className="feed">
          {rows.map((r, i) => (
            <div key={key(r)} className={`feeditem ${fresh.has(key(r)) ? "new" : ""}`}>
              <span className="rank" style={{ marginRight: 12 }}>
                {(page - 1) * PAGE_SIZE + i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <b>{r.competition_name}</b>
                <div className="small">
                  {r.village_name} · {r.entry_label ?? "—"}
                </div>
                <div className="muted small">
                  Juri {r.judge_name || "—"} ·{" "}
                  {new Date(r.submitted_at).toLocaleTimeString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="right">
                <b style={{ fontSize: "1.3rem", color: "var(--blue2)" }}>{fmtScore(r.total)}</b>
                <div className="muted small">{r.criteria_count} kriteria</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {total > PAGE_SIZE && (
        <div className="row between" style={{ marginTop: 12, alignItems: "center" }}>
          <span className="muted small">
            Halaman {page} dari {pages} · {total} penilaian
          </span>
          <div className="row">
            <button type="button" className="btn white sm" disabled={page <= 1 || loading} onClick={() => go(page - 1)}>
              ← Sebelumnya
            </button>
            <button type="button" className="btn white sm" disabled={page >= pages || loading} onClick={() => go(page + 1)}>
              Berikutnya →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
