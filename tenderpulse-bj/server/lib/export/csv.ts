import type { Tender } from "../store.js";

const COLUMNS: { key: keyof Tender | string; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "organization", label: "Organization" },
  { key: "district", label: "District" },
  { key: "category", label: "Category" },
  { key: "bid_submission_deadline", label: "Deadline" },
  { key: "publish_date", label: "Published" },
  { key: "external_ref", label: "Reference No" },
  { key: "nit_document_url", label: "Document URL" },
  { key: "source_name", label: "Source" },
];

function escapeCsvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function tendersToCsv(tenders: Tender[]): string {
  const header = COLUMNS.map((c) => c.label).join(",");
  const rows = tenders.map((t) => COLUMNS.map((c) => escapeCsvCell((t as any)[c.key])).join(","));
  return [header, ...rows].join("\n");
}

export { COLUMNS as EXPORT_COLUMNS };
