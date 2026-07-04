import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://bihtahospital.esic.gov.in/tenders/esichospital_tender_list", {
  waitUntil: "domcontentloaded",
  timeout: 45000,
});
await page.waitForTimeout(4000);
const info = await page.evaluate(() => {
  const table = document.querySelector("table");
  const allRows = table ? table.querySelectorAll("tr").length : 0;
  const html = table ? table.outerHTML.slice(0, 2000) : "no table";
  return { allRows, html };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
