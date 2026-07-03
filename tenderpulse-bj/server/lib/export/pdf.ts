import { chromium } from "playwright";
import type { Tender } from "../store.js";

function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildHtml(tenders: Tender[], title: string): string {
  const rows = tenders
    .map(
      (t) => `
      <tr>
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(t.organization)}</td>
        <td>${escapeHtml(t.district)}</td>
        <td>${escapeHtml(t.category)}</td>
        <td>${escapeHtml(t.bid_submission_deadline?.slice(0, 10))}</td>
        <td>${escapeHtml(t.external_ref)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; }
  </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">${tenders.length} tenders &middot; generated ${new Date().toLocaleString()}</div>
    <table>
      <thead><tr><th>Title</th><th>Organization</th><th>District</th><th>Category</th><th>Deadline</th><th>Reference No</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`;
}

export async function tendersToPdf(tenders: Tender[], title = "Tender List"): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(buildHtml(tenders, title), { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({ format: "A4", landscape: true, margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
    return pdf;
  } finally {
    await browser.close();
  }
}
