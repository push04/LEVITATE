// GeM public bids engine — scrapes bidplus.gem.gov.in filtered by Consignee
// State (Bihar / Jharkhand). The state/city/date-range "advance search" form
// is driven by an in-page searchBid() JS call rather than a plain form
// submit; a direct POST to the underlying /search-bids endpoint 403s without
// a session-scoped CSRF token that isn't exposed to a fresh fetch, so this
// drives the real page: select state, set a wide date range via direct DOM
// property assignment (the date inputs are readonly datepicker widgets, so
// .fill() doesn't work), then invoke window.searchBid('con') and read the
// resulting div.card list. Confirmed live: BIHAR alone returned 937 matches.
import { chromium } from "playwright";
import type { SourceConfig, RawTender } from "../normalizer.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const STATES = ["BIHAR", "JHARKHAND"];
const PAGES_PER_STATE = 5; // ~10 records/page, soonest-deadline first

export async function scrapeGemPublic(source: SourceConfig): Promise<RawTender[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: UA });
    const results: RawTender[] = [];

    for (const state of STATES) {
      await page.goto(source.base_url.replace("/all-bids", "/advance-search"), {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.waitForTimeout(1500);
      await page.locator("a, button", { hasText: /Consignee Location/i }).first().click();
      await page.waitForTimeout(500);
      await page.selectOption("#state_name_con", { label: state });
      await page.waitForTimeout(800);

      const today = new Date();
      const oneYearOut = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      await page.evaluate(
        ({ from, to }) => {
          const fromEl = document.querySelector("#bidEndFromCon") as HTMLInputElement;
          const toEl = document.querySelector("#bidEndToCon") as HTMLInputElement;
          fromEl.value = from;
          toEl.value = to;
        },
        { from: formatDdMmYyyy(new Date(today.getFullYear() - 1, 0, 1)), to: formatDdMmYyyy(oneYearOut) }
      );
      await page.evaluate(() => (window as any).searchBid && (window as any).searchBid("con"));
      await page.waitForTimeout(2500);

      for (let p = 0; p < PAGES_PER_STATE; p++) {
        const cards = await page.evaluate(() =>
          Array.from(document.querySelectorAll("div.card")).map((card) => {
            const text = (card as HTMLElement).innerText;
            return {
              bidNo: text.match(/Bid No\.?:\s*([^\n]+)/i)?.[1]?.trim(),
              dept: text.match(/Department Name And Address:\s*([^\n]+(?:\n[^\n]+)?)/i)?.[1]?.trim(),
              items: text.match(/Items:\s*([^\n]+)/i)?.[1]?.trim(),
              endDate: text.match(/End Date:\s*([^\n]+)/i)?.[1]?.trim(),
            };
          })
        );
        for (const c of cards) {
          if (!c.bidNo) continue;
          results.push({
            external_ref: c.bidNo,
            title: c.items || c.bidNo,
            organization: c.dept,
            // GeM's consignee filter only gives state-level granularity, not
            // district — leave district unset rather than fill it with the
            // state name (which would collide with the `state` field and
            // show up as a fake "district" in the admin panel's breakdown).
            bid_submission_deadline: parseGemDate(c.endDate),
          });
        }
        const nextBtn = page.locator("#light-pagination a.page-link.next").first();
        if ((await nextBtn.count()) === 0) break;
        await nextBtn.click().catch(() => {});
        await page.waitForTimeout(1800);
      }
    }

    return results;
  } finally {
    await browser.close();
  }
}

function formatDdMmYyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function parseGemDate(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min, ampm] = m;
  let hour = parseInt(hh, 10);
  if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${yyyy}-${mm}-${dd}T${String(hour).padStart(2, "0")}:${min}:00`;
}
