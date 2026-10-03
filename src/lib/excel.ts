import ExcelJS from "exceljs";

export interface ExcelColumn {
  header: string;
  key: string;
  /** Format angka, mis. "0.00" untuk nilai. Hanya berlaku untuk sel bertipe number. */
  numFmt?: string;
}

export type ExcelCell = string | number | boolean | null | undefined;
export type ExcelRow = Record<string, ExcelCell>;

export const SCORE_FMT = "0.00";

export function createWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FGU";
  wb.created = new Date();
  return wb;
}

/** Anti formula injection: string berawalan = + - @ atau tab diberi awalan apostrof. */
export function sanitizeCell(v: ExcelCell): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && /^[=+\-@\t]/.test(v)) return `'${v}`;
  return v;
}

/** Nama sheet: buang karakter terlarang, maks 31 karakter, unik dalam workbook. */
export function sheetName(wb: ExcelJS.Workbook, raw: string) {
  const base = (raw.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim() || "Sheet").slice(0, 31);
  const taken = new Set(wb.worksheets.map((s) => s.name.toLowerCase()));
  let name = base;
  for (let i = 2; taken.has(name.toLowerCase()); i++) {
    const suffix = ` (${i})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  return name;
}

export function addSheet(wb: ExcelJS.Workbook, name: string, columns: ExcelColumn[], rows: ExcelRow[]) {
  const ws = wb.addWorksheet(sheetName(wb, name), { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, style: c.numFmt ? { numFmt: c.numFmt } : {} }));

  for (const r of rows) {
    ws.addRow(columns.map((c) => sanitizeCell(r[c.key])));
  }

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle", wrapText: true };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F5AA5" } };
  });

  // Lebar kolom otomatis (maks 50 karakter).
  columns.forEach((c, i) => {
    let max = c.header.length;
    for (const r of rows) {
      const v = r[c.key];
      const len = v === null || v === undefined ? 0 : String(typeof v === "number" ? v.toFixed(2) : v).length;
      if (len > max) max = len;
    }
    ws.getColumn(i + 1).width = Math.min(50, max + 2);
  });

  if (columns.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  }
  return ws;
}
