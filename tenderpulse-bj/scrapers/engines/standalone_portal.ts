// Standalone single-org portal engine — each org has its own CMS, so this
// engine dispatches on `source.variant` rather than sharing one DOM pattern
// like the GePNIC/S3WaaS families do. Started as health-org-only (hence the
// original filename); now also covers other single-org state PSUs (BSBCCL,
// BRPNNL) that don't fit any other family. Confirmed live against every
// variant below.
import { chromium, type Page } from "playwright";
import type { SourceConfig, RawTender } from "../normalizer.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function scrapeStandalonePortal(source: SourceConfig): Promise<RawTender[]> {
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
      case "bsbccl":
        return await scrapeBsbccl(page);
      case "brpnnl":
        return await scrapeBrpnnl(page);
      case "jlnmch":
        return await scrapeJlnmch(page);
      case "nmch_patna":
        return await scrapeNmchPatna(page);
      case "gmch_purnea":
        return await scrapeGmchPurnea(page);
      case "vims_pawapuri":
        return await scrapeVimsPawapuri(page);
      case "bsrdcl":
        return await scrapeBsrdcl(page);
      case "patna_smart_city":
        return await scrapePatnaSmartCity(page);
      case "ranchi_smart_city":
        return await scrapeRanchiSmartCity(page);
      case "iim_ranchi":
        return await scrapeIimRanchi(page);
      case "jspcb":
        return await scrapeJspcb(page);
      case "bpbcc":
        return await scrapeBpbcc(page);
      case "dspmu_ranchi":
        return await scrapeDspmuRanchi(page);
      case "pup_patna":
        return await scrapePupPatna(page);
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

// Bihar State Building Construction Corporation Ltd (BSBCCL) — plain
// server-rendered ASP.NET table: Sl | Date | Type (NIT/EOI ref no.) |
// Subject (link to PDF, sometimes missing when no document is attached
// yet). No expiry/closing-date column on this listing, so bid_submission_
// deadline stays unset like most other single-org portals here.
async function scrapeBsbccl(page: Page): Promise<RawTender[]> {
  return page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Type/i.test(t.querySelector("tr")?.textContent || "") && /Subject/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const refNo = cells[2]?.textContent?.replace(/\s+/g, " ").trim() || "";
        const link = cells[3]?.querySelector("a") as HTMLAnchorElement | null;
        const title = (link?.textContent || cells[3]?.textContent || "").replace(/\s+/g, " ").trim();
        return {
          external_ref: refNo || title.slice(0, 250),
          title,
          nit_document_url: link?.href || null,
        };
      })
      .filter((t) => t.title && t.external_ref);
  });
}

// Bihar Rajya Pul Nirman Nigam Ltd (BRPNNL) — bridge-construction PSU;
// server-rendered GridView table: Tender Number (link) | Description
// (title attribute carries the untruncated text) | Expiry Date (DD-MM-YYYY).
async function scrapeBrpnnl(page: Page): Promise<RawTender[]> {
  const rows = await page.evaluate(() => {
    const table = document.querySelector('table[id*="gvDetails"]');
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const refLink = cells[1]?.querySelector("a") as HTMLAnchorElement | null;
        const refNo = refLink?.textContent?.replace(/\s+/g, " ").trim() || "";
        const subjectSpan = cells[2]?.querySelector("span[title]") as HTMLElement | null;
        const title = (subjectSpan?.getAttribute("title") || cells[2]?.textContent || "").replace(/\s+/g, " ").trim();
        const expiry = cells[3]?.textContent?.replace(/\s+/g, " ").trim() || "";
        return { refNo, title, href: refLink?.href || null, expiry };
      })
      .filter((r) => r.refNo && r.title);
  });

  return rows.map((r) => ({
    external_ref: r.refNo,
    title: r.title,
    nit_document_url: r.href,
    bid_submission_deadline: parseDdMmYyyy(r.expiry),
  }));
}

function parseDdMmYyyy(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}T00:00:00`;
}

// Jawaharlal Nehru Medical College & Hospital, Bhagalpur — plain table (S.No |
// Title | Download), with blank spacer <tr>s between every real row. No NIT
// reference number or date column, so the PDF filename (already unique —
// upload timestamps are baked into the name) doubles as external_ref.
async function scrapeJlnmch(page: Page): Promise<RawTender[]> {
  return page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Title/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .map((tr) => Array.from(tr.querySelectorAll("td")))
      .filter((cells) => cells.length >= 2 && cells[1]?.textContent?.trim())
      .map((cells) => {
        const title = cells[1].textContent!.replace(/\s+/g, " ").trim();
        const link = cells[2]?.querySelector("a") as HTMLAnchorElement | null;
        const href = link?.href || "";
        const fileName = decodeURIComponent(href.split("/").filter(Boolean).pop() || "");
        return {
          external_ref: (fileName || title).slice(0, 250),
          title,
          nit_document_url: href || null,
        };
      });
  });
}

// Nalanda Medical College & Hospital, Patna — table: Tender No. (a plain
// running serial, not a stable ref) | Title (link to PDF) | Issue Date |
// Last Date. The PDF filename is the stable id since the serial re-numbers
// as new rows get prepended; "Last Date" is the closing date when the
// college bothers to fill it in, which is inconsistent, so it's parsed
// best-effort rather than required.
async function scrapeNmchPatna(page: Page): Promise<RawTender[]> {
  const rows = await page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Tender No/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const link = cells[1]?.querySelector("a") as HTMLAnchorElement | null;
        return {
          title: (link?.textContent || cells[1]?.textContent || "").replace(/\s+/g, " ").trim(),
          href: link?.href || "",
          issueDate: cells[2]?.textContent?.replace(/\s+/g, " ").trim() || "",
          lastDate: cells[3]?.textContent?.replace(/\s+/g, " ").trim() || "",
        };
      })
      .filter((r) => r.title);
  });

  return rows.map((r) => {
    const fileName = decodeURIComponent(r.href.split("/").filter(Boolean).pop() || "");
    return {
      external_ref: (fileName || r.title).slice(0, 250),
      title: r.title,
      nit_document_url: r.href || null,
      publish_date: parseDdMmYyyy(r.issueDate),
      bid_submission_deadline: parseDdMmYyyy(r.lastDate),
    };
  });
}

// Government Medical College & Hospital, Purnea — table: S.No | Tender
// Category | Tender Title (link) | Date of Publishing | Date of Closing.
// A handful of rows are meeting-notice announcements rather than real tenders
// and drop the closing-date cell entirely (fewer <td>s), so column position
// isn't reliable — locate the cell that actually holds the link instead of
// assuming a fixed index, and read dates as "DD Mon, YYYY" text wherever
// they land.
async function scrapeGmchPurnea(page: Page): Promise<RawTender[]> {
  const rows = await page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Tender/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const linkCell = cells.find((c) => c.querySelector("a"));
        const link = linkCell?.querySelector("a") as HTMLAnchorElement | null;
        const title = (link?.textContent || linkCell?.textContent || cells[1]?.textContent || "")
          .replace(/\s+/g, " ")
          .trim();
        const dateTexts = cells
          .map((c) => c.textContent?.replace(/\s+/g, " ").trim() || "")
          .filter((t) => /\d{1,2}\s+\w{3},?\s+\d{4}/.test(t));
        return { title, href: link?.href || "", publishText: dateTexts[0] || "", closeText: dateTexts[1] || "" };
      })
      .filter((r) => r.title);
  });

  return rows.map((r) => {
    const fileName = decodeURIComponent(r.href.split("/").filter(Boolean).pop() || "");
    return {
      external_ref: (fileName || r.title).slice(0, 250),
      title: r.title,
      nit_document_url: r.href || null,
      publish_date: parseDMonYyyy(r.publishText),
      bid_submission_deadline: parseDMonYyyy(r.closeText),
    };
  });
}

function parseDMonYyyy(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})\s+(\w{3})\w*,?\s+(\d{4})/);
  if (!m) return null;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const mon = months[m[2].slice(0, 1).toUpperCase() + m[2].slice(1, 3).toLowerCase()];
  if (!mon) return null;
  return `${m[3]}-${mon}-${m[1].padStart(2, "0")}T00:00:00`;
}

// Bhagwan Mahavir Institute of Medical Sciences (VIMS), Pawapuri — simple
// 3-column table: Description (link doubles as title) | Publish Date
// (DD/MM/YYYY) | Last Date (usually blank).
async function scrapeVimsPawapuri(page: Page): Promise<RawTender[]> {
  const rows = await page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Description/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const link = cells[0]?.querySelector("a") as HTMLAnchorElement | null;
        return {
          title: (link?.textContent || cells[0]?.textContent || "").replace(/\s+/g, " ").trim(),
          href: link?.href || "",
          publishText: cells[1]?.textContent?.replace(/\s+/g, " ").trim() || "",
          lastText: cells[2]?.textContent?.replace(/\s+/g, " ").trim() || "",
        };
      })
      .filter((r) => r.title);
  });

  return rows.map((r) => {
    const fileName = decodeURIComponent(r.href.split("/").filter(Boolean).pop() || "");
    return {
      external_ref: (fileName || r.title).slice(0, 250),
      title: r.title,
      nit_document_url: r.href || null,
      publish_date: parseSlashDate(r.publishText),
      bid_submission_deadline: parseSlashDate(r.lastText),
    };
  });
}

function parseSlashDate(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}T00:00:00`;
}

// Bihar State Road Development Corporation Ltd (BSRDCL) — server-rendered
// ASP.NET table: Sl. No. | Tender No. | Open Date (DD-MM-YYYY) | Tender
// Details | View/Download (link only, no anchor text).
async function scrapeBsrdcl(page: Page): Promise<RawTender[]> {
  return page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Tender No/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const refNo = cells[1]?.textContent?.replace(/\s+/g, " ").trim() || "";
        const title = cells[3]?.textContent?.replace(/\s+/g, " ").trim() || "";
        const link = cells[4]?.querySelector("a") as HTMLAnchorElement | null;
        return { external_ref: refNo || title.slice(0, 250), title, nit_document_url: link?.href || null };
      })
      .filter((t) => t.title && t.external_ref);
  });
}

// Patna Smart City Ltd — server-rendered table: Sl No | NIT No | Tender
// Title | Closing Date & Time | PreBid Meeting Date & Time | Has Corrigendum.
// Every cell in a row shares the same detail-page href, so grabbing any
// cell's <a> works.
async function scrapePatnaSmartCity(page: Page): Promise<RawTender[]> {
  const rows = await page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /NIT No/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const link = cells.map((c) => c.querySelector("a") as HTMLAnchorElement | null).find(Boolean);
        return {
          refNo: cells[1]?.textContent?.replace(/\s+/g, " ").trim() || "",
          title: cells[2]?.textContent?.replace(/\s+/g, " ").trim() || "",
          closing: cells[3]?.textContent?.replace(/\s+/g, " ").trim() || "",
          href: link?.href || "",
        };
      })
      .filter((r) => r.title && r.refNo);
  });

  return rows.map((r) => ({
    external_ref: r.refNo,
    title: r.title,
    nit_document_url: r.href || null,
    bid_submission_deadline: parseDdMonYyyyHhMm(r.closing),
  }));
}

// "11-Jul-2026 17:00" style timestamp used by the smartpatna.co.in NIC
// e-tender template.
function parseDdMonYyyyHhMm(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [, day, mon, year, hh, mm] = m;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const monKey = mon.slice(0, 1).toUpperCase() + mon.slice(1, 3).toLowerCase();
  if (!months[monKey]) return null;
  return `${year}-${months[monKey]}-${day.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm}:00`;
}

// Ranchi Smart City Corporation Ltd — table: Sl.No | Tender notice
// (reference) | Description | Activity Status (Open/Close) | Download.
async function scrapeRanchiSmartCity(page: Page): Promise<RawTender[]> {
  return page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Tender notice/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const refNo = cells[1]?.textContent?.replace(/\s+/g, " ").trim() || "";
        const title = cells[2]?.textContent?.replace(/\s+/g, " ").trim() || "";
        const link = cells[4]?.querySelector("a") as HTMLAnchorElement | null;
        return { external_ref: refNo || title.slice(0, 250), title, nit_document_url: link?.href || null };
      })
      .filter((t) => t.title && t.external_ref);
  });
}

// IIM Ranchi — WordPress "tender" custom post type: each posting is its own
// detail-page link (not a PDF), 3-col table Title | Date | Status. The
// numeric post id in the URL (e.g. /tender/2026/07/24190/) is the stable ref.
async function scrapeIimRanchi(page: Page): Promise<RawTender[]> {
  const rows = await page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Title/i.test(t.querySelector("tr")?.textContent || "") && /Date/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const link = cells[0]?.querySelector("a") as HTMLAnchorElement | null;
        return {
          title: (link?.textContent || cells[0]?.textContent || "").replace(/\s+/g, " ").trim(),
          href: link?.href || "",
          dateText: cells[1]?.textContent?.replace(/\s+/g, " ").trim() || "",
        };
      })
      .filter((r) => r.title);
  });

  return rows.map((r) => {
    const idMatch = r.href.match(/\/(\d+)\/?$/);
    return {
      external_ref: idMatch ? `IIMR-${idMatch[1]}` : r.title.slice(0, 250),
      title: r.title,
      nit_document_url: r.href || null,
      publish_date: parseDMonYyyySpaced(r.dateText),
    };
  });
}

// "2 Jul 2026" style date used by IIM Ranchi's WordPress theme.
function parseDMonYyyySpaced(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{4})/);
  if (!m) return null;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const monKey = m[2].slice(0, 1).toUpperCase() + m[2].slice(1, 3).toLowerCase();
  if (!months[monKey]) return null;
  return `${m[3]}-${months[monKey]}-${m[1].padStart(2, "0")}T00:00:00`;
}

// Jharkhand State Pollution Control Board (JSPCB) — table: Sr | Title (link)
// | Publish Date (DD-MM-YYYY).
async function scrapeJspcb(page: Page): Promise<RawTender[]> {
  const rows = await page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Publish Date/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const link = cells[1]?.querySelector("a") as HTMLAnchorElement | null;
        return {
          title: (link?.textContent || cells[1]?.textContent || "").replace(/\s+/g, " ").trim(),
          href: link?.href || "",
          dateText: cells[2]?.textContent?.replace(/\s+/g, " ").trim() || "",
        };
      })
      .filter((r) => r.title);
  });

  return rows.map((r) => {
    const fileName = decodeURIComponent(r.href.split("/").filter(Boolean).pop() || "");
    return {
      external_ref: (fileName || r.title).slice(0, 250),
      title: r.title.replace(/\s*size:\(.*?\)\s*$/i, "").trim(),
      nit_document_url: r.href || null,
      publish_date: parseDdMmYyyy(r.dateText),
    };
  });
}

// Bihar Police Building Construction Corporation (BPBCC) — Hindi-labelled
// table: क्र (Sl) | निविदा का नाम (Tender name, link) | निविदा का तारीख
// (Tender date, DD-Mon-YYYY).
async function scrapeBpbcc(page: Page): Promise<RawTender[]> {
  const rows = await page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find(
      (t) => t.querySelectorAll("tr").length > 1 && t.querySelector("a[href*='PageContents']")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const link = cells[1]?.querySelector("a") as HTMLAnchorElement | null;
        return {
          title: (link?.textContent || cells[1]?.textContent || "").replace(/\s+/g, " ").trim(),
          href: link?.href || "",
          dateText: cells[2]?.textContent?.replace(/\s+/g, " ").trim() || "",
        };
      })
      .filter((r) => r.title);
  });

  return rows.map((r) => {
    const fileName = decodeURIComponent(r.href.split("/").filter(Boolean).pop() || "");
    return {
      external_ref: (fileName || r.title).slice(0, 250),
      title: r.title,
      nit_document_url: r.href || null,
      publish_date: parseDdMonYyyyDash(r.dateText),
    };
  });
}

// "01-Jul-2026" style date used by BPBCC's ASP.NET template.
function parseDdMonYyyyDash(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return null;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  if (!months[m[2]]) return null;
  return `${m[3]}-${months[m[2]]}-${m[1].padStart(2, "0")}T00:00:00`;
}

// Dr. Shyama Prasad Mukherjee University, Ranchi (DSPMU) — clean table:
// Tender Title (link) | Date of Publication | Last Date of Submission |
// Date & Time of Opening. Dates are "DD Mon YYYY" with a trailing "till
// H.MM PM" on the submission/opening columns — only the date part matters.
async function scrapeDspmuRanchi(page: Page): Promise<RawTender[]> {
  const rows = await page.evaluate(() => {
    const table = Array.from(document.querySelectorAll("table")).find((t) =>
      /Tender Title/i.test(t.querySelector("tr")?.textContent || "")
    );
    if (!table) return [];
    return Array.from(table.querySelectorAll("tr"))
      .slice(1)
      .map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const link = cells[0]?.querySelector("a") as HTMLAnchorElement | null;
        return {
          title: (link?.textContent || cells[0]?.textContent || "").replace(/\s+/g, " ").trim(),
          href: link?.href || "",
          publishText: cells[1]?.textContent?.replace(/\s+/g, " ").trim() || "",
          lastText: cells[2]?.textContent?.replace(/\s+/g, " ").trim() || "",
        };
      })
      .filter((r) => r.title);
  });

  return rows.map((r) => {
    const fileName = decodeURIComponent(r.href.split("/").filter(Boolean).pop() || "");
    return {
      external_ref: (fileName || r.title).slice(0, 250),
      title: r.title,
      nit_document_url: r.href || null,
      publish_date: parseDMonYyyySpaced(r.publishText),
      bid_submission_deadline: parseDMonYyyySpaced(r.lastText),
    };
  });
}

// Patna University — a single ASP.NET GridView holds both the umbrella
// NIQ/tender notice AND a nested BOQ table of per-department line items,
// each with its own "Download" link. Every row with a Download (or
// "Download NIT/NIQ Notice") link and non-trivial preceding text is treated
// as one procurable item — that matches how the university actually lists
// them (13 separate department equipment lists under one notice number).
async function scrapePupPatna(page: Page): Promise<RawTender[]> {
  const rows = await page.evaluate(() => {
    const out: { title: string; href: string }[] = [];
    document.querySelectorAll("td").forEach((td) => {
      const link = td.querySelector("a") as HTMLAnchorElement | null;
      if (!link || !/download/i.test(link.textContent || "")) return;
      const row = td.closest("tr");
      if (!row) return;
      const cells = Array.from(row.querySelectorAll("td"));
      // Prefer a sibling cell that looks like a work/item description
      // (longer free text, not a bare number or currency amount).
      const desc = cells
        .map((c) => c.textContent?.replace(/\s+/g, " ").trim() || "")
        .find((t) => t.length > 15 && !/^[\d,.\-/₹\s]+$/.test(t) && !/^download/i.test(t));
      if (!desc) return;
      out.push({ title: desc, href: link.href });
    });
    return out;
  });

  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.href) ? false : (seen.add(r.href), true)))
    .map((r) => {
      const fileName = decodeURIComponent(r.href.split("/").filter(Boolean).pop() || "");
      return {
        external_ref: (fileName || r.title).slice(0, 250),
        title: r.title.slice(0, 500),
        nit_document_url: r.href || null,
      } satisfies RawTender;
    });
}
