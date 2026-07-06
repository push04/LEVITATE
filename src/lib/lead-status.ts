// Canonical status vocabulary for the global `leads` table (used by the
// admin CRM page, BizHarvest, contact form, CSV import, and AI-scrape
// promotion). Keep every hardcoded status list/validator across the app in
// sync with this one array instead of re-typing it.
export const LEAD_STATUSES = ['New', 'Contacted', 'Follow Up', 'Done', 'Closed', 'Paid'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Statuses that represent the deal being finished, one way or another -
// used for "closed vs active" style stats (Done and Paid both mean the
// pipeline stage is over, same as Closed).
export const TERMINAL_LEAD_STATUSES: LeadStatus[] = ['Closed', 'Done', 'Paid'];

export const LEAD_STATUS_PILL_CLASS: Record<string, string> = {
  New: 'bg-blue-50 text-blue-700 border-blue-200',
  Contacted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Follow Up': 'bg-purple-50 text-purple-700 border-purple-200',
  Done: 'bg-teal-50 text-teal-700 border-teal-200',
  Closed: 'bg-green-50 text-green-700 border-green-200',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const LEAD_STATUS_HEX: Record<string, string> = {
  New: '#2563eb',
  Contacted: '#eab308',
  'Follow Up': '#7c3aed',
  Done: '#0d9488',
  Closed: '#16a34a',
  Paid: '#059669',
};
