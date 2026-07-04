import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const targets = [
  "https://dmc.edu.in/procurement/tender/",
  "https://nmchpatna.org/tenders/",
  "https://jlnmchbgp.org/tender.php",
  "https://www.skmedicalcollege.org/",
];

const browser = await chromium.launch({ headless: true });
for (const url of targets) {
  console.log(`\n=== ${url} ===`);
  try {
    const page = await browser.newPage({ userAgent: UA });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);
    const info = await page.evaluate(() => {
      const tables = document.querySelectorAll("table").length;
      const pdfLinks = Array.from(document.querySelectorAll("a[href$='.pdf'], a[href*='.pdf']")).length;
      const bodyText = document.body.innerText.slice(0, 0);
      // Grab any element whose text mentions "tender" case-insensitively, short snippet
      const candidates = Array.from(document.querySelectorAll("li, tr, div, article"))
        .filter((el) => /tender|NIT|quotation/i.test(el.textContent || "") && (el.textContent || "").length < 400)
        .slice(0, 5)
        .map((el) => el.textContent!.replace(/\s+/g, " ").trim());
      return { tables, pdfLinks, title: document.title, candidates };
    });
    console.log(JSON.stringify(info, null, 2));
  } catch (err) {
    console.log("ERROR:", (err as Error).message);
  }
}
await browser.close();
