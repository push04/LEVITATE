import { scrapeStandalonePortal } from "../engines/standalone_portal.js";

const rows = await scrapeStandalonePortal({
  name: "JLNMCH",
  family: "standalone",
  variant: "jlnmch",
  base_url: "https://jlnmchbgp.org/tender.php",
  state: "Bihar",
  district: "Bhagalpur",
  org_type: "hospital",
  poll_frequency_minutes: 120,
});
console.log(`rows: ${rows.length}`);
console.log(JSON.stringify(rows.slice(0, 4), null, 2));
