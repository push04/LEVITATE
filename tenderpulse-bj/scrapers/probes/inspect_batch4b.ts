import { chromium } from "playwright";

const targets = [
  "https://bausabour.ac.in/tenders.aspx",
  "https://www.pup.ac.in/TenderNew.aspx",
  "https://ppup.ac.in/tender",
  "https://ranchiuniversity.ac.in/index.php?option=com_phocadownload&view=category&id=3&Itemid=349",
  "https://dspmuranchi.ac.in/Tender.aspx",
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
              text: c.textContent?.replace(/\s+/g, " ").trim().slice(0, 90),
              href: (c.querySelector("a") as HTMLAnchorElement | null)?.href,
            }))
          )
        : [];
      const listItems = Array.from(document.querySelectorAll("li, article"))
        .filter((el) => {
          const t = el.textContent || "";
          return t.length > 15 && t.length < 250 && el.children.length <= 4 && el.querySelector("a");
        })
        .slice(0, 6)
        .map((el) => {
          const a = el.querySelector("a") as HTMLAnchorElement | null;
          return { text: el.textContent!.replace(/\s+/g, " ").trim().slice(0, 120), href: a?.href };
        });
      return { tableCount: tables.length, header, sampleRows, listItemsSample: listItems };
    });
    console.log(JSON.stringify(info, null, 2));
  } catch (err) {
    console.log("ERROR:", (err as Error).message);
  }
}
await browser.close();
