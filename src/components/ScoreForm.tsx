"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import { submitScores } from "@/app/actions/juri";
import { fmtScore } from "@/lib/utils";

interface Crit {
  id: string;
  group_name: string | null;
  name: string;
  weight: number;
  max_score: number;
}

export function ScoreForm({
  entryId,
  slug,
  criteria,
  method,
}: {
  entryId: string;
  slug: string;
  criteria: Crit[];
  method: "weighted_criteria" | "points";
}) {
  const [vals, setVals] = useState<Record<string, string>>({});

  const total = (() => {
    if (method === "points") {
      return criteria.reduce((s, c) => s + (Number(vals[c.id]) || 0), 0);
    }
    const w = criteria.reduce((s, c) => s + c.weight, 0);
    const sum = criteria.reduce(
      (s, c) => s + ((Number(vals[c.id]) || 0) / c.max_score) * c.weight,
      0,
    );
    return w ? (100 * sum) / w : 0;
  })();

  const groups: { name: string | null; items: Crit[] }[] = [];
  for (const c of criteria) {
    const g = groups.find((x) => x.name === c.group_name);
    if (g) g.items.push(c);
    else groups.push({ name: c.group_name, items: [c] });
  }

  return (
    <ActionForm
      action={submitScores}
      confirm="Kirim nilai? Setelah dikirim, nilai terkunci dan tidak dapat diubah."
    >
      <input type="hidden" name="entry_id" value={entryId} />
      <input type="hidden" name="slug" value={slug} />

      {groups.map((g) => (
        <div key={g.name ?? "_"} className="field">
          {g.name && <h3>{g.name}</h3>}
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Kriteria</th>
                  <th>Bobot</th>
                  <th style={{ width: 150 }}>Nilai (0–{fmtScore(g.items[0].max_score)})</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <label htmlFor={`c_${c.id}`} style={{ margin: 0 }}>
                        {c.name}
                      </label>
                    </td>
                    <td className="muted">{method === "points" ? "—" : `${fmtScore(c.weight)}%`}</td>
                    <td>
                      <input
                        id={`c_${c.id}`}
                        name={`c_${c.id}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={c.max_score}
                        required
                        value={vals[c.id] ?? ""}
                        onChange={(e) => setVals({ ...vals, [c.id]: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="row between" style={{ marginTop: 16 }}>
        <div>
          <span className="muted">Total (pratinjau): </span>
          <b style={{ fontSize: "1.4rem" }}>{fmtScore(total)}</b>
        </div>
        <SubmitButton className="btn green" pendingText="Mengirim…">
          Kirim nilai
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
