import { scrapeStandalonePortal } from "../engines/standalone_portal.js";

const sources = [
  {
    name: "BSRDCL",
    family: "standalone" as const,
    variant: "bsrdcl",
    base_url: "https://bsrdcl.bihar.gov.in/tenders.aspx",
    state: "Bihar",
    district: null,
    org_type: "psu" as const,
    poll_frequency_minutes: 120,
  },
  {
    name: "Patna Smart City",
    family: "standalone" as const,
    variant: "patna_smart_city",
    base_url: "https://www.smartpatna.co.in/open_tenders.aspx",
    state: "Bihar",
    district: "Patna",
    org_type: "municipal" as const,
    poll_frequency_minutes: 120,
  },
  {
    name: "Ranchi Smart City",
    family: "standalone" as const,
    variant: "ranchi_smart_city",
    base_url: "https://www.rsccl.in/CitizenPortal-Ranchi/tenders",
    state: "Jharkhand",
    district: "Ranchi",
    org_type: "municipal" as const,
    poll_frequency_minutes: 120,
  },
];

for (const s of sources) {
  const rows = await scrapeStandalonePortal(s);
  console.log(`\n=== ${s.name}: ${rows.length} rows ===`);
  console.log(JSON.stringify(rows.slice(0, 3), null, 2));
}
