import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://iiitranchi.ac.in/tender.aspx", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const tables = Array.from(document.querySelectorAll("table"));
  return tables.map((t, i) => ({
    idx: i,
    rowCount: t.querySelectorAll("tr").length,
    firstRows: Array.from(t.querySelectorAll("tr")).slice(0, 3).map((tr) =>
      Array.from(tr.querySelectorAll("td")).map((c) => ({
        text: c.textContent?.replace(/\s+/g, " ").trim(),
        href: (c.querySelector("a") as HTMLAnchorElement | null)?.href,
      }))
    ),
  }));
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
