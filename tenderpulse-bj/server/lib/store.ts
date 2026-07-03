// Local JSON-backed data layer for the admin panel.
//
// Two ownership zones, kept in separate files on purpose so the crawler
// process (scrapers/main.ts) and this API server never fight over the same
// file:
//   - data/tenders.json      — scraper-owned, read-only from here.
//   - data/tender_overrides.json — admin-owned overlay (category correction,
//     notes, hide/restore) keyed by tender id, merged in on read.
//   - data/clients.json, data/deliveries.json — fully admin-owned, CRUD lives
//     entirely in this file.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { StoredTender } from "../../scrapers/dedup.js";
import type { TenderCategory } from "../../scrapers/normalizer.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const TENDERS_PATH = path.join(DATA_DIR, "tenders.json");
const OVERRIDES_PATH = path.join(DATA_DIR, "tender_overrides.json");
const CLIENTS_PATH = path.join(DATA_DIR, "clients.json");
const DELIVERIES_PATH = path.join(DATA_DIR, "deliveries.json");

function loadJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export interface TenderOverride {
  category?: TenderCategory;
  notes?: string;
  is_hidden?: boolean;
  tags?: string[];
  updated_at: string;
}

export interface Tender extends StoredTender {
  notes?: string;
  tags?: string[];
  is_hidden?: boolean;
}

export function getAllTenders(): Tender[] {
  const raw = loadJson<Record<string, StoredTender>>(TENDERS_PATH, {});
  const overrides = loadJson<Record<string, TenderOverride>>(OVERRIDES_PATH, {});
  return Object.values(raw).map((t) => {
    const o = overrides[t.id];
    if (!o) return t;
    return {
      ...t,
      category: o.category ?? t.category,
      notes: o.notes,
      tags: o.tags,
      is_hidden: o.is_hidden,
    };
  });
}

export function getTenderById(id: string): Tender | undefined {
  return getAllTenders().find((t) => t.id === id);
}

export function updateTenderOverride(id: string, patch: Partial<TenderOverride>): Tender | undefined {
  const overrides = loadJson<Record<string, TenderOverride>>(OVERRIDES_PATH, {});
  overrides[id] = { ...overrides[id], ...patch, updated_at: new Date().toISOString() };
  writeJsonAtomic(OVERRIDES_PATH, overrides);
  return getTenderById(id);
}

export function hideTender(id: string) {
  return updateTenderOverride(id, { is_hidden: true });
}

export function restoreTender(id: string) {
  return updateTenderOverride(id, { is_hidden: false });
}

// ---------------------------------------------------------------------------
// Clients (companies you deliver tenders to)
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  company_name: string;
  contact_name?: string;
  email: string;
  phone_number?: string;
  districts: string[];
  categories: TenderCategory[];
  keywords: string[];
  min_value?: number;
  max_value?: number;
  delivery_frequency: "instant" | "daily" | "weekly";
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function getAllClients(): Client[] {
  return Object.values(loadJson<Record<string, Client>>(CLIENTS_PATH, {}));
}

export function getClientById(id: string): Client | undefined {
  return loadJson<Record<string, Client>>(CLIENTS_PATH, {})[id];
}

export function createClient(input: Omit<Client, "id" | "created_at" | "updated_at">): Client {
  const clients = loadJson<Record<string, Client>>(CLIENTS_PATH, {});
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const client: Client = { ...input, id, created_at: now, updated_at: now };
  clients[id] = client;
  writeJsonAtomic(CLIENTS_PATH, clients);
  return client;
}

export function updateClient(id: string, patch: Partial<Client>): Client | undefined {
  const clients = loadJson<Record<string, Client>>(CLIENTS_PATH, {});
  if (!clients[id]) return undefined;
  clients[id] = { ...clients[id], ...patch, id, updated_at: new Date().toISOString() };
  writeJsonAtomic(CLIENTS_PATH, clients);
  return clients[id];
}

export function deleteClient(id: string): boolean {
  const clients = loadJson<Record<string, Client>>(CLIENTS_PATH, {});
  if (!clients[id]) return false;
  delete clients[id];
  writeJsonAtomic(CLIENTS_PATH, clients);
  return true;
}

// ---------------------------------------------------------------------------
// Deliveries (audit log of every email / export sent)
// ---------------------------------------------------------------------------

export interface Delivery {
  id: string;
  client_id?: string;
  tender_ids: string[];
  channel: "email" | "pdf" | "csv" | "xlsx" | "doc" | "manual_download";
  recipient_email?: string;
  file_format?: string;
  status: "pending" | "sent" | "failed";
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export function getAllDeliveries(): Delivery[] {
  return Object.values(loadJson<Record<string, Delivery>>(DELIVERIES_PATH, {})).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function recordDelivery(input: Omit<Delivery, "id" | "created_at">): Delivery {
  const deliveries = loadJson<Record<string, Delivery>>(DELIVERIES_PATH, {});
  const id = crypto.randomUUID();
  const delivery: Delivery = { ...input, id, created_at: new Date().toISOString() };
  deliveries[id] = delivery;
  writeJsonAtomic(DELIVERIES_PATH, deliveries);
  return delivery;
}

export function updateDelivery(id: string, patch: Partial<Delivery>): void {
  const deliveries = loadJson<Record<string, Delivery>>(DELIVERIES_PATH, {});
  if (!deliveries[id]) return;
  deliveries[id] = { ...deliveries[id], ...patch };
  writeJsonAtomic(DELIVERIES_PATH, deliveries);
}

export function getCrawlReport() {
  return loadJson(path.join(DATA_DIR, "crawl_report.json"), []);
}
