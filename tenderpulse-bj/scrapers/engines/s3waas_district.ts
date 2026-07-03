// S3WaaS district engine — every Bihar/Jharkhand district admin site runs on
// NIC's S3WaaS CMS with a shared "notice_category/tenders" URL pattern and
// identical card/table markup. One engine, looped across all district
// sources in config. Confirmed live against Aurangabad (Bihar, real
// corrigenda) and Patna (Bihar, genuinely empty — "no notice matched").
import { chromium } from "playwright";
import type { SourceConfig, RawTender } from "../normalizer.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function scrapeS3waasDistrict(source: SourceConfig): Promise<RawTender[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(source.base_url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);

    const rows = await page.evaluate(() => {
      const table = Array.from(document.querySelectorAll("table")).find((t) => {
        const header = t.querySelector("tr")?.textContent || "";
        return /Title/i.test(header) && /(Start Date|End Date|Description)/i.test(header);
      });
      if (!table) return [];
      return Array.from(table.querySelectorAll("tr"))
        .slice(1)
        .map((tr) => {
          const tds = Array.from(tr.querySelectorAll("td"));
          const link = tr.querySelector("a[href]") as HTMLAnchorElement | null;
          return {
            cells: tds.map((td) => td.textContent?.trim() || ""),
            href: link?.href || null,
          };
        })
        .filter((r) => r.cells.length >= 2 && r.cells[0]);
    });

    return rows.map(({ cells, href }) => {
      const [title, , startDate, endDate] = cells;
      return {
        external_ref: `${source.name}::${title}`.slice(0, 250),
        title: title.replace(/\s+/g, " ").trim(),
        publish_date: parseDdMmYyyy(startDate),
        bid_submission_deadline: parseDdMmYyyy(endDate),
        nit_document_url: href,
      } satisfies RawTender;
    });
  } finally {
    await browser.close();
  }
}

function parseDdMmYyyy(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
