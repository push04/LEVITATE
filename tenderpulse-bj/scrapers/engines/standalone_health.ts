// Standalone health-portal engine — each org has its own CMS, so this engine
// dispatches on `source.variant` rather than sharing one DOM pattern like the
// GePNIC/S3WaaS families do. Confirmed live against all six variants below.
import { chromium, type Page } from "playwright";
import type { SourceConfig, RawTender } from "../normalizer.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function scrapeStandaloneHealth(source: SourceConfig): Promise<RawTender[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(source.base_url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);

    switch (source.variant) {
      case "shsb":
        return await scrapeShsb(page);
      case "bmsicl":
        return await scrapeBmsicl(page);
      case "jrhms":
        return await scrapeJrhms(page);
      case "igims":
        return await scrapeIgims(page);
      case "aiims_patna":
        return await scrapeAiimsPatna(page);
      case "rims_ranchi":
        return await scrapeRimsRanchi(page);
      default:
        throw new Error(`Unknown standalone variant: ${source.variant}`);
    }
  } finally {
    await browser.close();
  }
}

// State Health Society, Bihar — single "Tender" text column, title carries
// the "e-tender (NIT) Reference No.: X/SHSB/..." reference inline.
async function scrapeShsb(page: Page): Promise<RawTender[]> {
  const cells = await page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Tender/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => tr.querySelectorAll("td")[1]?.textContent?.replace(/\s+/g, " ").trim() || "")
      .filter(Boolean);
  });
  return cells.map((text) => {
    const refMatch = text.match(/Reference No\.?:?\s*-?\s*([^\s:][\w\/\-. ]*?\d{2}-\d{2})/i);
    const ref = refMatch ? refMatch[1].trim() : text.slice(0, 80);
    return { external_ref: ref, title: text.slice(0, 500) } satisfies RawTender;
  });
}

// BMSICL — WordPress/Avada blog-style listing; post links sit in the body
// with no class attribute, unlike the classed nav-menu anchors.
async function scrapeBmsicl(page: Page): Promise<RawTender[]> {
  const items = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a"))
      .filter((a) => a.className === "" && (a.textContent?.trim().length || 0) > 25)
      .map((a) => ({ title: a.textContent!.trim(), href: a.href }));
  });
  const seen = new Set<string>();
  return items
    .filter((i) => (seen.has(i.href) ? false : (seen.add(i.href), true)))
    .map((i) => {
      const slug = i.href.split("/").filter(Boolean).pop() || i.title;
      return { external_ref: slug.slice(0, 250), title: i.title, nit_document_url: i.href } satisfies RawTender;
    });
}

// JRHMS — card list, one `.report-item` per tender with a stable TenderId.
async function scrapeJrhms(page: Page): Promise<RawTender[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll(".report-item")).map((item) => {
      const spans = Array.from(item.querySelectorAll(".report-item-title span"));
      const title = spans.map((s) => s.textContent?.trim() || "").find((t) => t.length > 3) || "";
      const link = item.querySelector("a[href*='TenderId=']") as HTMLAnchorElement | null;
      const idMatch = link?.href.match(/TenderId=(\d+)/);
      return {
        external_ref: idMatch ? `JRHMS-${idMatch[1]}` : title.slice(0, 80),
        title: title.replace(/\s+/g, " "),
        nit_document_url: link?.href || null,
      };
    }).filter((t) => t.title);
  });
}

// IGIMS Patna — clean table: Tender | Description | Attachments | Expiry | View
async function scrapeIgims(page: Page): Promise<RawTender[]> {
  // IGIMS renders one <table> per tender (each with its own "Tender
  // Description / Attachment's / Expiry / View" header row), not one shared
  // listing table — so every matching table contributes its data rows.
  return page.evaluate(() => {
    const tables = Array.from(document.querySelectorAll("table")).filter((t) =>
      /Tender Description/i.test(t.querySelector("tr")?.textContent || "")
    );
    return tables.flatMap((table) =>
      Array.from(table.querySelectorAll("tr"))
        .slice(1)
        .map((tr) => {
          const cells = Array.from(tr.querySelectorAll("td")).map((td) => td.textContent?.trim() || "");
          const link = tr.querySelector("a[href$='.pdf']") as HTMLAnchorElement | null;
          return {
            external_ref: (cells[0] || "").slice(0, 250),
            title: cells[0] || "",
            nit_document_url: link?.href || null,
          };
        })
        .filter((t) => t.title)
    );
  });
}

// AIIMS Patna — table with explicit GeM-style tender numbers.
async function scrapeAiimsPatna(page: Page): Promise<RawTender[]> {
  return page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /TENDER NO/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent?.trim() || ""))
      .filter((cells) => cells.length >= 3 && cells[1])
      .map((cells) => ({
        external_ref: cells[1],
        title: cells[2] || cells[1],
      }));
  });
}

// RIMS Ranchi — flat table of local-tender notices; no separate ref number,
// so the (long, effectively unique) description text doubles as the key.
async function scrapeRimsRanchi(page: Page): Promise<RawTender[]> {
  const titles = await page.evaluate(() => {
    const table = document.querySelector("table");
    if (!table) return [];
    return Array.from(table.querySelectorAll("td"))
      .map((td) => td.textContent?.replace(/\s+/g, " ").trim() || "")
      .filter((t) => t.length > 20);
  });
  return titles.slice(0, 50).map((title) => ({
    external_ref: title.slice(0, 250),
    title,
  }));
}
