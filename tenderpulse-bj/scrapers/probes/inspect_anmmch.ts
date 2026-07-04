import { chromium } from "playwright";

const targets = ["https://magadhhighereducation.info/tender.php", "https://anmmch.bihar.gov.in/"];

const browser = await chromium.launch({ headless: true });
for (const url of targets) {
  console.log(`\n=== ${url} ===`);
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);
    const info = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll("table"));
      const pdfLinks = document.querySelectorAll("a[href$='.pdf'], a[href*='.pdf']").length;
      const firstTableHeader = tables[0]?.querySelector("tr")?.textContent?.replace(/\s+/g, " ").trim();
      const sampleRows = tables[0]
        ? Array.from(tables[0].querySelectorAll("tr")).slice(0, 5).map((tr) =>
            Array.from(tr.querySelectorAll("td,th")).map((c) => c.textContent?.replace(/\s+/g, " ").trim())
          )
        : [];
      const tenderLinks = [...document.querySelectorAll("a")]
        .filter((a) => /tender/i.test(a.textContent || "") || /tender/i.test(a.href))
        .slice(0, 10)
        .map((a) => ({ text: a.textContent?.trim(), href: a.href }));
      return { title: document.title, tableCount: tables.length, pdfLinks, firstTableHeader, sampleRows, tenderLinks };
    });
    console.log(JSON.stringify(info, null, 2));
  } catch (err) {
    console.log("ERROR:", (err as Error).message);
  }
}
await browser.close();
