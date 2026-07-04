import { scrapeStandalonePortal } from "../engines/standalone_portal.js";

const rows = await scrapeStandalonePortal({
  name: "NMCH",
  family: "standalone",
  variant: "nmch_patna",
  base_url: "https://www.nmchpatna.ac.in/tenders.php",
  state: "Bihar",
  district: "Patna",
  org_type: "hospital",
  poll_frequency_minutes: 120,
});
console.log(`rows: ${rows.length}`);
console.log(JSON.stringify(rows.slice(0, 5), null, 2));
