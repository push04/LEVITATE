import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://phedbihar.gov.in/", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(2000);
const links = await page.evaluate(() =>
  [...document.querySelectorAll("a")]
    .filter((a) => /tender/i.test(a.textContent || "") || /tender/i.test(a.href))
    .map((a) => ({ text: a.textContent?.trim(), href: a.href }))
);
console.log(JSON.stringify(links, null, 2));
await browser.close();
