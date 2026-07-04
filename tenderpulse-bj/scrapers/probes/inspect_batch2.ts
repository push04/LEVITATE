import { chromium } from "playwright";

const targets = [
  "https://bihtahospital.esic.gov.in/tenders/esichospital_tender_list",
  "https://gmcbettiah.org/Tenders/",
  "https://gmchpurnea.com/notification/tenders/",
  "https://vimspawapuri.org/tender/",
];

const browser = await chromium.launch({ headless: true });
for (const url of targets) {
  console.log(`\n=== ${url} ===`);
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);
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
      // non-table fallback: list/card items mentioning tender
      const listItems = Array.from(document.querySelectorAll("li, article, div"))
        .filter((el) => {
          const t = el.textContent || "";
          return /tender|NIT/i.test(t) && t.length > 15 && t.length < 300 && el.children.length <= 3;
        })
        .slice(0, 5)
        .map((el) => el.textContent!.replace(/\s+/g, " ").trim());
      return { tableCount: tables.length, header, sampleRows, listItemsSample: listItems };
    });
    console.log(JSON.stringify(info, null, 2));
  } catch (err) {
    console.log("ERROR:", (err as Error).message);
  }
}
await browser.close();
