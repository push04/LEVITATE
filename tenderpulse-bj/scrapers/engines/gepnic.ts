// GePNIC engine — covers any NIC GePNIC-family portal (Jharkhand state portal,
// PMGSY Bihar, and by config extension any other GePNIC deployment).
// The homepage embeds a live "latest active tenders" ticker table refreshed
// every ~15 min; that table is what we scrape (confirmed via probe against
// both jharkhandtenders.gov.in and pmgsytendersbih.gov.in — same structure).
import { chromium } from "playwright";
import type { SourceConfig, RawTender } from "../normalizer.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function scrapeGepnic(source: SourceConfig): Promise<RawTender[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(source.base_url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);

    const rows = await page.evaluate(() => {
      // The real listing lives in a marquee-scrolled inner table
      // (id="activeTenders"), nested inside the header table that carries
      // the "Tender Title / Reference No / ..." column labels.
      const target = document.querySelector("table#activeTenders");
      if (!target) return [];
      return Array.from(target.querySelectorAll("tr"))
        .map((tr) =>
          Array.from(tr.querySelectorAll("td")).map((td) => td.textContent?.trim() || "")
        )
        .filter((row) => row.length >= 3 && row[0]);
    });

    const parsed: RawTender[] = [];
    for (const cells of rows) {
      const title = cells[0].replace(/^\d+\.\s*/, "").trim();
      const refNo = cells[1]?.trim();
      const closingDate = cells[2]?.trim();
      if (!title || !refNo) continue;
      parsed.push({
        external_ref: refNo,
        title,
        bid_submission_deadline: parseGepnicDate(closingDate),
      });
    }
    return parsed;
  } finally {
    await browser.close();
  }
}

function parseGepnicDate(raw?: string): string | null {
  if (!raw) return null;
  // format: "13-Jul-2026 05:00 PM"
  const m = raw.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/);
  if (!m) return null;
  const [, day, mon, year, hh, mm, ampm] = m;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  let hour = parseInt(hh, 10);
  if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
  const iso = `${year}-${months[mon]}-${day.padStart(2, "0")}T${String(hour).padStart(2, "0")}:${mm}:00`;
  return iso;
}
