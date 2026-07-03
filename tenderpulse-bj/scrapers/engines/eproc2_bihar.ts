// eProc2 Bihar engine — mjunction-built platform covering all Bihar state
// government departments (PWD, RCD, Irrigation, Panchayati Raj, Energy,
// BELTRON, etc). Confirmed live at eproc2.bihar.gov.in; the open-area
// tender listing table is AngularJS-rendered (id="myTablebyrTl").
import { chromium } from "playwright";
import type { SourceConfig, RawTender } from "../normalizer.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function scrapeEproc2Bihar(source: SourceConfig): Promise<RawTender[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(source.base_url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.waitForSelector("table#myTablebyrTl tr", { timeout: 15000 }).catch(() => {});

    const rows = await page.evaluate(() => {
      const table = document.querySelector("table#myTablebyrTl");
      if (!table) return [];
      return Array.from(table.querySelectorAll("tr"))
        .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent?.trim() || ""))
        .filter((cells) => cells.length >= 6 && /^\d+$/.test(cells[0]));
    });

    return rows.map((cells) => {
      const [, tenderId, description, refNo, department, endDate] = cells;
      return {
        external_ref: (refNo || tenderId).trim(),
        title: description.trim(),
        organization: department?.trim(),
        bid_submission_deadline: parseEproc2Date(endDate),
      } satisfies RawTender;
    });
  } finally {
    await browser.close();
  }
}

function parseEproc2Date(raw?: string): string | null {
  if (!raw) return null;
  // format: "2026-07-04 11:00"
  const m = raw.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
  if (!m) return null;
  return `${m[1]}T${m[2]}:00`;
}
