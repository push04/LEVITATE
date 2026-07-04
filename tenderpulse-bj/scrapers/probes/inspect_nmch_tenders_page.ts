import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://www.nmchpatna.ac.in/tenders.php", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => {
  const tables = Array.from(document.querySelectorAll("table"));
  const rows = tables[0]
    ? Array.from(tables[0].querySelectorAll("tr")).slice(0, 8).map((tr) =>
        Array.from(tr.querySelectorAll("td,th")).map((c) => ({
          text: c.textContent?.replace(/\s+/g, " ").trim(),
          href: (c.querySelector("a") as HTMLAnchorElement | null)?.href,
        }))
      )
    : null;
  // Fallback: card/list-based layout
  const cards = Array.from(document.querySelectorAll("li,article,div.card,div.tender-item")).filter(
    (el) => /tender/i.test(el.textContent || "") && (el.textContent || "").length < 300
  ).slice(0, 6).map((el) => el.textContent!.replace(/\s+/g, " ").trim());
  return { tableCount: tables.length, rows, cardsSample: cards };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
