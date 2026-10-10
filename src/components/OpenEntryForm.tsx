"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "./ActionForm";
import {
  BLANK_ROW,
  hasErrors,
  MAX_OPEN_ROWS,
  validateOpenRow,
  allowsBulk,
  type OpenComp,
  type OpenRow,
  type OpenRowErrors,
} from "@/lib/openEntry";
import type { ActionState } from "@/lib/types";

function Req() {
  return (
    <span className="req" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

/**
 * Form pendaftaran lomba "open" yang bisa diisi banyak peserta sekaligus.
 * Dipakai di beranda (publik, pilih desa) dan portal Admin Desa (desa dari akun).
 */
export function OpenEntryForm({
  comps,
  villages,
  action,
  fixedCompId,
  used,
  onCancel,
}: {
  comps: OpenComp[];
  /** Hanya untuk pendaftaran publik; Admin Desa memakai desa dari akunnya. */
  villages?: { id: string; name: string }[];
  action: (fd: FormData) => Promise<ActionState>;
  fixedCompId?: string;
  /** Jumlah pendaftaran aktif desa yang login pada lomba ini (hanya portal Admin Desa). */
  used?: number;
  onCancel?: () => void;
}) {
  const [compId, setCompId] = useState(fixedCompId ?? comps[0]?.id ?? "");
  const [villageId, setVillageId] = useState("");
  const [rows, setRows] = useState<OpenRow[]>([{ ...BLANK_ROW }]);
  const [errors, setErrors] = useState<OpenRowErrors[]>([]);
  const [villageError, setVillageError] = useState("");
  const [now] = useState(() => Date.now());

  const comp = comps.find((c) => c.id === compId);
  if (!comp) return <div className="alert info">Belum ada lomba yang dibuka untuk pendaftaran ini.</div>;
  const has = (f: "parent_name" | "ig_username" | "submission_url") => comp.form_fields.includes(f);

  // Batas pengiriman & kuota per desa (database tetap menolak bila dilanggar).
  const bulk = allowsBulk(comp);
  const closed = !!comp.deadlineIso && now > new Date(comp.deadlineIso).getTime();
  const remaining =
    comp.maxPerVillage !== null && used !== undefined ? Math.max(comp.maxPerVillage - used, 0) : null;
  const full = remaining !== null && remaining <= 0;
  const rowLimit = !bulk
    ? 1
    : remaining !== null
      ? Math.max(Math.min(remaining, MAX_OPEN_ROWS), 1)
      : MAX_OPEN_ROWS;
  const blocked = closed || full;

  const setRow = (i: number, patch: Partial<OpenRow>) => {
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setErrors((cur) =>
      cur[i] ? cur.map((e, idx) => (idx === i ? { ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) } : e)) : cur,
    );
  };

  async function submit(fd: FormData): Promise<ActionState> {
    if (blocked) return { error: closed ? "Batas pengiriman sudah lewat." : "Kuota desa Anda sudah penuh." };
    if (rows.length > rowLimit) return { error: `Sisa kuota desa Anda hanya ${rowLimit} pendaftaran.` };
    if (villages && !villageId) {
      setVillageError("Pilih desa");
      document.getElementById("open-village")?.focus();
      return {};
    }
    const found = rows.map((r) => validateOpenRow(r, comp!.form_fields, comp!.allow_team));
    setErrors(found);
    const bad = found.findIndex(hasErrors);
    if (bad >= 0) {
      const field = (Object.keys(found[bad]) as (keyof OpenRow)[]).find((k) => found[bad][k]);
      document.getElementById(`open-${bad}-${field}`)?.focus();
      return {};
    }
    fd.set("competition_id", comp!.id);
    if (villages) fd.set("village_id", villageId);
    fd.set("rows", JSON.stringify(rows));
    const res = await action(fd);
    if (res.ok) {
      setRows([{ ...BLANK_ROW }]);
      setErrors([]);
    }
    return res;
  }

  const err = (i: number, k: keyof OpenRow) => errors[i]?.[k];
  const inputProps = (i: number, k: keyof OpenRow) => ({
    id: `open-${i}-${k}`,
    "aria-invalid": !!err(i, k),
    "aria-describedby": err(i, k) ? `open-${i}-${k}-error` : undefined,
  });
  const fieldErr = (i: number, k: keyof OpenRow) =>
    err(i, k) ? (
      <p id={`open-${i}-${k}-error`} className="field-err" role="alert">
        {err(i, k)}
      </p>
    ) : null;

  return (
    <ActionForm action={submit} noValidate>
      <p className="req-note">
        <span className="req">*</span> wajib diisi
      </p>

      {/* Honeypot anti-bot: tidak terlihat oleh manusia */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, overflow: "hidden" }}>
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {!fixedCompId && comps.length > 1 && (
        <div className="field">
          <label htmlFor="open-comp">
            Pilih Lomba
            <Req />
          </label>
          <select
            id="open-comp"
            value={compId}
            onChange={(e) => {
              setCompId(e.target.value);
              setRows([{ ...BLANK_ROW }]);
              setErrors([]);
            }}
          >
            {comps.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {villages && (
        <div className="field">
          <label htmlFor="open-village">
            Desa
            <Req />
          </label>
          <select
            id="open-village"
            value={villageId}
            aria-invalid={!!villageError}
            onChange={(e) => {
              setVillageId(e.target.value);
              setVillageError("");
            }}
          >
            <option value="">Pilih desa…</option>
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {villageError && (
            <p className="field-err" role="alert">
              {villageError}
            </p>
          )}
        </div>
      )}

      {comp.note && <div className="alert info small">📝 {comp.note}</div>}
      {closed && <div className="alert err">Batas pengiriman sudah lewat ({comp.deadline}); pendaftaran ditutup.</div>}
      {full && !closed && (
        <div className="alert err">
          Kuota desa Anda sudah penuh ({used} dari {comp.maxPerVillage}).
        </div>
      )}

      <p className="field-hint" style={{ marginBottom: 10 }}>
        {bulk ? (
          <>
            Bisa mengisi <b>banyak peserta sekaligus</b>: klik &ldquo;+ Tambah peserta&rdquo; untuk baris baru.
          </>
        ) : (
          <>Satu pendaftaran untuk satu {comp.allow_team ? "peserta atau tim" : "peserta"} setiap kali kirim.</>
        )}
        {comp.deadline && !closed && <> Batas pengiriman: {comp.deadline}.</>}
        {comp.maxPerVillage !== null && (
          <>
            {" "}
            Maksimal {comp.maxPerVillage} pendaftaran per desa
            {remaining !== null ? ` — terisi ${used} dari ${comp.maxPerVillage}, sisa ${remaining}` : ""}.
          </>
        )}
      </p>

      <div className="open-rows">
        {rows.map((row, i) => {
          const team = comp.allow_team && row.entry_type === "team";
          return (
            <fieldset key={i} className="open-row">
              <legend>
                {team ? "Tim" : "Peserta"} {i + 1}
              </legend>
              {rows.length > 1 && (
                <button
                  type="button"
                  className="open-row-remove"
                  onClick={() => {
                    setRows((cur) => cur.filter((_, idx) => idx !== i));
                    setErrors((cur) => cur.filter((_, idx) => idx !== i));
                  }}
                  aria-label={`Hapus peserta ${i + 1}`}
                >
                  ✕
                </button>
              )}
              <div className="fields" style={{ alignItems: "start" }}>
                {comp.allow_team && (
                  <div>
                    <label htmlFor={`open-${i}-entry_type`}>
                      Jenis
                      <Req />
                    </label>
                    <select
                      {...inputProps(i, "entry_type")}
                      value={row.entry_type}
                      onChange={(e) => setRow(i, { entry_type: e.target.value as OpenRow["entry_type"] })}
                    >
                      <option value="individual">Individu</option>
                      <option value="team">Tim</option>
                    </select>
                    {fieldErr(i, "entry_type")}
                  </div>
                )}
                <div>
                  <label htmlFor={`open-${i}-name`}>
                    {team ? "Nama tim" : "Nama peserta"}
                    <Req />
                  </label>
                  <input
                    {...inputProps(i, "name")}
                    type="text"
                    maxLength={100}
                    placeholder={team ? "Nama tim" : "Nama lengkap peserta"}
                    value={row.name}
                    onChange={(e) => setRow(i, { name: e.target.value })}
                  />
                  {fieldErr(i, "name")}
                </div>
                {has("parent_name") && (
                  <div>
                    <label htmlFor={`open-${i}-parent_name`}>
                      Nama orang tua
                      <Req />
                    </label>
                    <input
                      {...inputProps(i, "parent_name")}
                      type="text"
                      maxLength={100}
                      value={row.parent_name}
                      onChange={(e) => setRow(i, { parent_name: e.target.value })}
                    />
                    {fieldErr(i, "parent_name")}
                  </div>
                )}
                {has("ig_username") && (
                  <div>
                    <label htmlFor={`open-${i}-ig_username`}>
                      Username Instagram
                      <Req />
                    </label>
                    <input
                      {...inputProps(i, "ig_username")}
                      type="text"
                      maxLength={31}
                      placeholder="@username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={row.ig_username}
                      onChange={(e) => setRow(i, { ig_username: e.target.value })}
                    />
                    {fieldErr(i, "ig_username")}
                  </div>
                )}
              </div>
              {has("submission_url") && (
                <div style={{ marginTop: 12 }}>
                  <label htmlFor={`open-${i}-submission_url`}>
                    Link video / karya
                    <Req />
                  </label>
                  <input
                    {...inputProps(i, "submission_url")}
                    type="url"
                    maxLength={500}
                    placeholder="https://drive.google.com/… atau https://instagram.com/…"
                    value={row.submission_url}
                    onChange={(e) => setRow(i, { submission_url: e.target.value })}
                  />
                  <p className="field-hint">
                    Link Google Drive harus dibuka untuk siapa saja yang memiliki link; akun Instagram jangan digembok.
                  </p>
                  {fieldErr(i, "submission_url")}
                </div>
              )}
              {team && (
                <div style={{ marginTop: 12 }}>
                  <label htmlFor={`open-${i}-members_note`}>Anggota tim (opsional)</label>
                  <textarea
                    {...inputProps(i, "members_note")}
                    rows={2}
                    maxLength={500}
                    placeholder="Tulis nama anggota, dipisah koma"
                    value={row.members_note}
                    onChange={(e) => setRow(i, { members_note: e.target.value })}
                  />
                  {fieldErr(i, "members_note")}
                </div>
              )}
            </fieldset>
          );
        })}
      </div>

      {bulk && (
        <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <button
            type="button"
            className="btn soft sm"
            disabled={blocked || rows.length >= rowLimit}
            onClick={() => setRows((cur) => [...cur, { ...BLANK_ROW }])}
          >
            + Tambah peserta
          </button>
          <span className="muted small">
            {rows.length} / {rowLimit}
          </span>
        </div>
      )}

      <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Tutup
          </button>
        )}
        <SubmitButton pendingText="Mengirim…" disabled={blocked}>Kirim {rows.length > 1 ? `${rows.length} Pendaftaran` : "Pendaftaran"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
