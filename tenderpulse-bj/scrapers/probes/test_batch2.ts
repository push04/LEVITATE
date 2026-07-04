import { scrapeStandalonePortal } from "../engines/standalone_portal.js";

const sources = [
  {
    name: "GMCH Purnea",
    family: "standalone" as const,
    variant: "gmch_purnea",
    base_url: "https://gmchpurnea.com/notification/tenders/",
    state: "Bihar",
    district: "Purnea",
    org_type: "hospital" as const,
    poll_frequency_minutes: 120,
  },
  {
    name: "VIMS Pawapuri",
    family: "standalone" as const,
    variant: "vims_pawapuri",
    base_url: "https://vimspawapuri.org/tender/",
    state: "Bihar",
    district: "Nalanda",
    org_type: "hospital" as const,
    poll_frequency_minutes: 120,
  },
];

for (const s of sources) {
  const rows = await scrapeStandalonePortal(s);
  console.log(`\n=== ${s.name}: ${rows.length} rows ===`);
  console.log(JSON.stringify(rows.slice(0, 4), null, 2));
}
