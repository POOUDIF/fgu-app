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

export function LiveFeed({ initial }: { initial: Submission[] }) {
  const [rows, setRows] = useState<Submission[]>(initial);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const known = useRef(new Set(initial.map(key)));

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function reload() {
      const { data } = await supabase
        .from("live_submissions")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(40);
      if (!data) return;
      const list = data as Submission[];
      const added = list.filter((r) => !known.current.has(key(r))).map(key);
      list.forEach((r) => known.current.add(key(r)));
      setRows(list);
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
        timer = setTimeout(reload, 500);
      })
      .subscribe((s) => {
        setStatus(s === "SUBSCRIBED" ? "live" : s === "CLOSED" || s === "CHANNEL_ERROR" ? "offline" : "connecting");
      });

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

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
          {rows.map((r) => (
            <div key={key(r)} className={`feeditem ${fresh.has(key(r)) ? "new" : ""}`}>
              <div>
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
    </div>
  );
}
