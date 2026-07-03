import type { Client, Tender } from "./store.js";

export function tenderMatchesClient(tender: Tender, client: Client): boolean {
  if (tender.is_hidden) return false;

  if (client.districts.length && !client.districts.some((d) => tender.district?.toLowerCase() === d.toLowerCase()))
    return false;

  if (client.categories.length && !client.categories.includes((tender.category as any) || "other")) return false;

  if (client.keywords.length) {
    const hay = `${tender.title} ${tender.organization ?? ""}`.toLowerCase();
    if (!client.keywords.some((k) => hay.includes(k.toLowerCase()))) return false;
  }

  const value = (tender as any).estimated_value_inr as number | undefined;
  if (value != null) {
    if (client.min_value != null && value < client.min_value) return false;
    if (client.max_value != null && value > client.max_value) return false;
  }

  return true;
}

export function matchTendersForClient(tenders: Tender[], client: Client): Tender[] {
  return tenders.filter((t) => tenderMatchesClient(t, client));
}
