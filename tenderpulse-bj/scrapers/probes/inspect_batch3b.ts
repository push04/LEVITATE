import { chromium } from "playwright";

const targets = [
  "https://www.jsmdc.in/web/tenders",
  "https://www.jsmdc.in/web/Tenders.php",
  "https://mgmmedicalcollege.org/download-category/tender/",
];

const browser = await chromium.launch({ headless: true });
for (const url of targets) {
  console.log(`\n=== ${url} ===`);
  try {
    const page = await browser.newPage();
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
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
      const listItems = Array.from(document.querySelectorAll("li, article, div.download-item, div.post"))
        .filter((el) => (el.textContent || "").length > 10 && (el.textContent || "").length < 250 && el.children.length <= 4)
        .slice(0, 8)
        .map((el) => el.textContent!.replace(/\s+/g, " ").trim());
      return { tableCount: tables.length, header, sampleRows, listItems };
    });
    console.log(JSON.stringify({ status: resp?.status(), ...info }, null, 2));
  } catch (err) {
    console.log("ERROR:", (err as Error).message);
  }
}
await browser.close();
