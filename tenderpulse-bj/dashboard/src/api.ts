export interface Tender {
  id: string;
  external_ref: string;
  title: string;
  organization?: string;
  district?: string;
  state?: string;
  category?: string;
  bid_submission_deadline?: string | null;
  publish_date?: string | null;
  nit_document_url?: string | null;
  source_name: string;
  first_seen_at: string;
  last_seen_at: string;
  notes?: string;
  tags?: string[];
  is_hidden?: boolean;
}

export interface TendersResponse {
  total: number;
  page: number;
  pageSize: number;
  tenders: Tender[];
}

export interface TenderFilters {
  q?: string;
  category?: string;
  district?: string;
  state?: string;
  source?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

const BASE = "/api";

function qs(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export async function fetchTenders(filters: TenderFilters): Promise<TendersResponse> {
  const res = await fetch(`${BASE}/tenders${qs(filters as Record<string, unknown>)}`);
  if (!res.ok) throw new Error(`tenders fetch failed: ${res.status}`);
  return res.json();
}

export async function updateTender(id: string, patch: Partial<Tender>) {
  const res = await fetch(`${BASE}/tenders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("update failed");
  return res.json();
}

export async function hideTender(id: string) {
  const res = await fetch(`${BASE}/tenders/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("delete failed");
  return res.json();
}

export async function restoreTender(id: string) {
  const res = await fetch(`${BASE}/tenders/${id}/restore`, { method: "POST" });
  if (!res.ok) throw new Error("restore failed");
  return res.json();
}

export interface Analytics {
  total: number;
  hidden: number;
  upcomingDeadlines7d: number;
  expired: number;
  noDeadline: number;
  byCategory: { name: string; count: number }[];
  byDistrict: { name: string; count: number }[];
  byState: { name: string; count: number }[];
  bySource: { name: string; count: number }[];
  byDay: [string, number][];
  topOrganizations: { name: string; count: number }[];
  deadlineBuckets: { name: string; count: number }[];
}

export async function fetchAnalytics(): Promise<Analytics> {
  const res = await fetch(`${BASE}/analytics`);
  if (!res.ok) throw new Error("analytics fetch failed");
  return res.json();
}

export interface Client {
  id: string;
  company_name: string;
  contact_name?: string;
  email: string;
  phone_number?: string;
  districts: string[];
  categories: string[];
  keywords: string[];
  min_value?: number;
  max_value?: number;
  delivery_frequency: "instant" | "daily" | "weekly";
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchClients(): Promise<Client[]> {
  const res = await fetch(`${BASE}/clients`);
  if (!res.ok) throw new Error("clients fetch failed");
  return res.json();
}

export async function createClient(input: Partial<Client>): Promise<Client> {
  const res = await fetch(`${BASE}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json()).error || "create failed");
  return res.json();
}

export async function updateClient(id: string, patch: Partial<Client>): Promise<Client> {
  const res = await fetch(`${BASE}/clients/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("update failed");
  return res.json();
}

export async function deleteClient(id: string): Promise<void> {
  const res = await fetch(`${BASE}/clients/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("delete failed");
}

export async function previewClientMatches(id: string): Promise<{ count: number; tenders: Tender[] }> {
  const res = await fetch(`${BASE}/clients/${id}/matches`);
  if (!res.ok) throw new Error("matches fetch failed");
  return res.json();
}

export async function sendClientDigestNow(id: string) {
  const res = await fetch(`${BASE}/clients/${id}/send-now`, { method: "POST" });
  return res.json();
}

export async function sendSelectedTenders(to: string, tenderIds: string[], subject?: string) {
  const res = await fetch(`${BASE}/send-selected`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, tenderIds, subject }),
  });
  return res.json();
}

export interface Delivery {
  id: string;
  client_id?: string;
  tender_ids: string[];
  channel: string;
  recipient_email?: string;
  status: "pending" | "sent" | "failed";
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export async function fetchDeliveries(): Promise<Delivery[]> {
  const res = await fetch(`${BASE}/deliveries`);
  if (!res.ok) throw new Error("deliveries fetch failed");
  return res.json();
}

export function exportUrl(format: string, ids?: string[]): string {
  return `${BASE}/export/${format}${ids?.length ? qs({ ids: ids.join(",") }) : ""}`;
}

export const CATEGORIES = ["civil_works", "supply", "services", "it", "mining", "health", "education", "other"];
