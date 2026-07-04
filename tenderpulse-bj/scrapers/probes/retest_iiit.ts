import { scrapeStandalonePortal } from "../engines/standalone_portal.js";

const rows = await scrapeStandalonePortal({
  name: "IIIT Ranchi",
  family: "standalone",
  variant: "iiit_ranchi",
  base_url: "https://iiitranchi.ac.in/tender.aspx",
  state: "Jharkhand",
  district: "Ranchi",
  org_type: "state_dept",
  poll_frequency_minutes: 120,
});
console.log(`rows: ${rows.length}`);
console.log(JSON.stringify(rows.slice(0, 4), null, 2));
