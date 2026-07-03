import ExcelJS from "exceljs";
import type { Tender } from "../store.js";
import { EXPORT_COLUMNS } from "./csv.js";

export async function tendersToXlsx(tenders: Tender[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TenderPulse BJ";
  const sheet = workbook.addWorksheet("Tenders");

  sheet.columns = EXPORT_COLUMNS.map((c) => ({ header: c.label, key: String(c.key), width: 28 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };

  for (const t of tenders) {
    sheet.addRow(Object.fromEntries(EXPORT_COLUMNS.map((c) => [String(c.key), (t as any)[c.key] ?? ""])));
  }
  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + EXPORT_COLUMNS.length)}1` };

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
