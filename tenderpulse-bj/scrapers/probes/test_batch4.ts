import { scrapeStandalonePortal } from "../engines/standalone_portal.js";

const sources = [
  { name: "IIM Ranchi", variant: "iim_ranchi", base_url: "https://iimranchi.ac.in/tender/", state: "Jharkhand", district: "Ranchi" },
  { name: "IIIT Ranchi", variant: "iiit_ranchi", base_url: "https://iiitranchi.ac.in/tender.aspx", state: "Jharkhand", district: "Ranchi" },
  { name: "JSPCB", variant: "jspcb", base_url: "https://jspcb.org.in/whats-new/", state: "Jharkhand", district: null },
  { name: "BPBCC", variant: "bpbcc", base_url: "https://bpbcc.bihar.gov.in/Info/Tenders/", state: "Bihar", district: null },
  { name: "DSPMU Ranchi", variant: "dspmu_ranchi", base_url: "https://dspmuranchi.ac.in/Tender.aspx", state: "Jharkhand", district: "Ranchi" },
  { name: "Patna University", variant: "pup_patna", base_url: "https://www.pup.ac.in/TenderNew.aspx", state: "Bihar", district: "Patna" },
] as const;

for (const s of sources) {
  try {
    const rows = await scrapeStandalonePortal({
      name: s.name,
      family: "standalone",
      variant: s.variant,
      base_url: s.base_url,
      state: s.state,
      district: s.district,
      org_type: "state_dept",
      poll_frequency_minutes: 120,
    });
    console.log(`\n=== ${s.name}: ${rows.length} rows ===`);
    console.log(JSON.stringify(rows.slice(0, 3), null, 2));
  } catch (err) {
    console.log(`\n=== ${s.name}: ERROR ===`, (err as Error).message);
  }
}
