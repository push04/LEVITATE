import { scrapeStandalonePortal } from "../engines/standalone_portal.js";

const sources = [
  {
    name: "BSBCCL",
    family: "standalone" as const,
    variant: "bsbccl",
    base_url: "https://bsbccl.bihar.gov.in/New_V/NewTenderDetails.aspx?TenderD=NewTenderDetails.aspx",
    state: "Bihar",
    district: null,
    org_type: "psu" as const,
    poll_frequency_minutes: 120,
  },
  {
    name: "BRPNNL",
    family: "standalone" as const,
    variant: "brpnnl",
    base_url: "https://brpnnl.bihar.gov.in/Tenders.aspx",
    state: "Bihar",
    district: null,
    org_type: "psu" as const,
    poll_frequency_minutes: 120,
  },
];

for (const s of sources) {
  const rows = await scrapeStandalonePortal(s);
  console.log(`\n=== ${s.name}: ${rows.length} rows ===`);
  console.log(JSON.stringify(rows.slice(0, 3), null, 2));
}
