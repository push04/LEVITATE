import { chromium } from "playwright";

const targets = [
  "https://bsrdcl.bihar.gov.in/tenders.aspx",
  "https://www.smartpatna.co.in/open_tenders.aspx",
  "https://www.rsccl.in/CitizenPortal-Ranchi/tenders",
  "https://phedbihar.gov.in/",
  "https://www.jsmdc.in/",
  "https://mgmmedicalcollege.org/download-category/tender/",
];

const browser = await chromium.launch({ headless: true });
for (const url of targets) {
  console.log(`\n=== ${url} ===`);
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll("table"));
      const header = tables[0]?.querySelector("tr")?.textContent?.replace(/\s+/g, " ").trim();
      const sampleRows = tables[0]
        ? Array.from(tables[0].querySelectorAll("tr")).slice(1, 4).map((tr) =>
            Array.from(tr.querySelectorAll("td")).map((c) => ({
              text: c.textContent?.replace(/\s+/g, " ").trim().slice(0, 100),
              href: (c.querySelector("a") as HTMLAnchorElement | null)?.href,
            }))
          )
        : [];
      const tenderLinksOnPage = [...document.querySelectorAll("a")]
        .filter((a) => /tender/i.test(a.textContent || "") || /tender/i.test(a.href))
        .slice(0, 8)
        .map((a) => ({ text: a.textContent?.trim().slice(0, 60), href: a.href }));
      return { tableCount: tables.length, header, sampleRows, tenderLinksOnPage };
    });
    console.log(JSON.stringify(info, null, 2));
  } catch (err) {
    console.log("ERROR:", (err as Error).message);
  }
}
await browser.close();
