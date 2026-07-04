import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://jlnmchbgp.org/tender.php", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const table = document.querySelector("table");
  if (!table) return null;
  const rows = Array.from(table.querySelectorAll("tr")).slice(0, 6).map((tr) =>
    Array.from(tr.querySelectorAll("td,th")).map((c) => ({
      text: c.textContent?.replace(/\s+/g, " ").trim(),
      href: (c.querySelector("a") as HTMLAnchorElement | null)?.href,
    }))
  );
  return { rowCount: table.querySelectorAll("tr").length, sample: rows };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
