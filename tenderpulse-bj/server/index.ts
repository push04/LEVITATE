import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import {
  getAllTenders,
  getTenderById,
  updateTenderOverride,
  hideTender,
  restoreTender,
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getAllDeliveries,
  recordDelivery,
  updateDelivery,
  getCrawlReport,
  type Tender,
} from "./lib/store.js";
import { buildAnalytics } from "./lib/analytics.js";
import { smartSearch } from "./lib/search.js";
import { tendersToCsv } from "./lib/export/csv.js";
import { tendersToXlsx } from "./lib/export/xlsx.js";
import { tendersToDocx } from "./lib/export/docx.js";
import { tendersToPdf } from "./lib/export/pdf.js";
import { sendEmail } from "./lib/mailer.js";
import { matchTendersForClient } from "./lib/matcher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.ADMIN_PORT || 4000);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ---------------------------------------------------------------------------
// Tenders: list + filter + sort + smart search
// ---------------------------------------------------------------------------

app.get("/api/tenders", async (req, res) => {
  let tenders = getAllTenders();

  const {
    q,
    category,
    district,
    state,
    source,
    minValue,
    maxValue,
    deadlineFrom,
    deadlineTo,
    sortBy = "bid_submission_deadline",
    sortDir = "asc",
    page = "1",
    pageSize = "50",
    includeHidden,
  } = req.query as Record<string, string>;

  if (!includeHidden) tenders = tenders.filter((t) => !t.is_hidden);
  if (category) tenders = tenders.filter((t) => t.category === category);
  if (district) tenders = tenders.filter((t) => t.district?.toLowerCase() === district.toLowerCase());
  if (state) tenders = tenders.filter((t) => (t as any).state?.toLowerCase() === state.toLowerCase());
  if (source) tenders = tenders.filter((t) => t.source_name === source);
  if (minValue) tenders = tenders.filter((t) => ((t as any).estimated_value_inr ?? 0) >= Number(minValue));
  if (maxValue) tenders = tenders.filter((t) => ((t as any).estimated_value_inr ?? Infinity) <= Number(maxValue));
  if (deadlineFrom)
    tenders = tenders.filter((t) => t.bid_submission_deadline && t.bid_submission_deadline >= deadlineFrom);
  if (deadlineTo)
    tenders = tenders.filter((t) => t.bid_submission_deadline && t.bid_submission_deadline <= deadlineTo);

  if (q) tenders = await smartSearch(tenders, q);

  tenders.sort((a, b) => {
    const av = (a as any)[sortBy] ?? "";
    const bv = (b as any)[sortBy] ?? "";
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "desc" ? -cmp : cmp;
  });

  const total = tenders.length;
  const p = Math.max(1, Number(page));
  const ps = Math.min(500, Math.max(1, Number(pageSize)));
  const paged = tenders.slice((p - 1) * ps, p * ps);

  res.json({ total, page: p, pageSize: ps, tenders: paged });
});

app.get("/api/tenders/:id", (req, res) => {
  const t = getTenderById(req.params.id);
  if (!t) return res.status(404).json({ error: "not found" });
  res.json(t);
});

app.patch("/api/tenders/:id", (req, res) => {
  const { category, notes, tags } = req.body || {};
  const t = updateTenderOverride(req.params.id, { category, notes, tags });
  if (!t) return res.status(404).json({ error: "not found" });
  res.json(t);
});

app.delete("/api/tenders/:id", (req, res) => {
  const t = hideTender(req.params.id);
  if (!t) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

app.post("/api/tenders/:id/restore", (req, res) => {
  const t = restoreTender(req.params.id);
  if (!t) return res.status(404).json({ error: "not found" });
  res.json(t);
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

app.get("/api/analytics", (_req, res) => {
  res.json(buildAnalytics(getAllTenders()));
});

app.get("/api/sources", (_req, res) => {
  res.json(getCrawlReport());
});

// ---------------------------------------------------------------------------
// Export — CSV / XLSX / PDF / DOCX, either explicit ids or the same filters
// as the list endpoint (pass ids=comma,separated or reuse query filters)
// ---------------------------------------------------------------------------

function resolveExportTenders(req: express.Request): Tender[] {
  const all = getAllTenders().filter((t) => !t.is_hidden);
  const { ids } = req.query as Record<string, string>;
  if (ids) {
    const idSet = new Set(ids.split(","));
    return all.filter((t) => idSet.has(t.id));
  }
  return all;
}

app.get("/api/export/:format", async (req, res) => {
  const format = req.params.format;
  const tenders = resolveExportTenders(req);
  const filenameBase = `tenders-${new Date().toISOString().slice(0, 10)}`;

  try {
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.csv"`);
      return res.send(tendersToCsv(tenders));
    }
    if (format === "xlsx") {
      const buf = await tendersToXlsx(tenders);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.xlsx"`);
      return res.send(buf);
    }
    if (format === "docx" || format === "doc") {
      const buf = await tendersToDocx(tenders);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.docx"`);
      return res.send(buf);
    }
    if (format === "pdf") {
      const buf = await tendersToPdf(tenders);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.pdf"`);
      return res.send(buf);
    }
    res.status(400).json({ error: "unsupported format, use csv/xlsx/docx/pdf" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ---------------------------------------------------------------------------
// Clients (companies) — full CRUD
// ---------------------------------------------------------------------------

app.get("/api/clients", (_req, res) => res.json(getAllClients()));

app.get("/api/clients/:id", (req, res) => {
  const c = getClientById(req.params.id);
  if (!c) return res.status(404).json({ error: "not found" });
  res.json(c);
});

app.post("/api/clients", (req, res) => {
  const b = req.body || {};
  if (!b.company_name || !b.email) return res.status(400).json({ error: "company_name and email are required" });
  const client = createClient({
    company_name: b.company_name,
    contact_name: b.contact_name,
    email: b.email,
    phone_number: b.phone_number,
    districts: b.districts || [],
    categories: b.categories || [],
    keywords: b.keywords || [],
    min_value: b.min_value,
    max_value: b.max_value,
    delivery_frequency: b.delivery_frequency || "daily",
    is_active: b.is_active ?? true,
    notes: b.notes,
  });
  res.status(201).json(client);
});

app.patch("/api/clients/:id", (req, res) => {
  const c = updateClient(req.params.id, req.body || {});
  if (!c) return res.status(404).json({ error: "not found" });
  res.json(c);
});

app.delete("/api/clients/:id", (req, res) => {
  const ok = deleteClient(req.params.id);
  if (!ok) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

// Preview which tenders currently match a client's filters, without sending.
app.get("/api/clients/:id/matches", (req, res) => {
  const client = getClientById(req.params.id);
  if (!client) return res.status(404).json({ error: "not found" });
  const matches = matchTendersForClient(getAllTenders(), client);
  res.json({ count: matches.length, tenders: matches });
});

// ---------------------------------------------------------------------------
// Deliveries (send email alerts, log every send)
// ---------------------------------------------------------------------------

app.get("/api/deliveries", (_req, res) => res.json(getAllDeliveries()));

app.post("/api/clients/:id/send-now", async (req, res) => {
  const client = getClientById(req.params.id);
  if (!client) return res.status(404).json({ error: "not found" });

  const matches = matchTendersForClient(getAllTenders(), client);
  if (!matches.length) return res.json({ sent: false, reason: "no matching tenders" });

  const html = buildDigestHtml(client.company_name, matches);
  const delivery = recordDelivery({
    client_id: client.id,
    tender_ids: matches.map((t) => t.id),
    channel: "email",
    recipient_email: client.email,
    status: "pending",
  });

  const result = await sendEmail({
    to: client.email,
    subject: `${matches.length} tender${matches.length === 1 ? "" : "s"} matching your filters — TenderPulse BJ`,
    html,
  });

  updateDelivery(delivery.id, {
    status: result.ok ? "sent" : "failed",
    error_message: result.error,
    sent_at: result.ok ? new Date().toISOString() : undefined,
  });

  res.json({ sent: result.ok, error: result.error, tenderCount: matches.length });
});

// Ad-hoc: email a specific set of selected tenders to any address, not tied
// to a saved client filter.
app.post("/api/send-selected", async (req, res) => {
  const { to, tenderIds, subject } = req.body || {};
  if (!to || !Array.isArray(tenderIds) || !tenderIds.length) {
    return res.status(400).json({ error: "to and tenderIds[] are required" });
  }
  const idSet = new Set(tenderIds as string[]);
  const tenders = getAllTenders().filter((t) => idSet.has(t.id));

  const delivery = recordDelivery({
    tender_ids: tenders.map((t) => t.id),
    channel: "email",
    recipient_email: to,
    status: "pending",
  });

  const result = await sendEmail({
    to,
    subject: subject || `${tenders.length} tenders — TenderPulse BJ`,
    html: buildDigestHtml("", tenders),
  });

  updateDelivery(delivery.id, {
    status: result.ok ? "sent" : "failed",
    error_message: result.error,
    sent_at: result.ok ? new Date().toISOString() : undefined,
  });

  res.json({ sent: result.ok, error: result.error });
});

function buildDigestHtml(companyName: string, tenders: Tender[]): string {
  const rows = tenders
    .map(
      (t) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(t.title)}<br/>
          <span style="color:#666;font-size:12px;">${escapeHtml(t.organization || "")} &middot; ${escapeHtml(t.district || "")}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(t.category || "")}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(t.bid_submission_deadline?.slice(0, 10) || "—")}</td>
      </tr>`
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;max-width:640px;">
    <h2 style="margin-bottom:4px;">${companyName ? escapeHtml(companyName) + " — " : ""}Tender Digest</h2>
    <p style="color:#666;margin-top:0;">${tenders.length} tenders matching your filters, from Bihar &amp; Jharkhand government sources.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:#f5f5f5;"><th style="padding:8px;text-align:left;">Tender</th><th style="padding:8px;text-align:left;">Category</th><th style="padding:8px;text-align:left;">Deadline</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ---------------------------------------------------------------------------
// Static dashboard build (React app) + SPA fallback
// ---------------------------------------------------------------------------

const dashboardDist = path.resolve(__dirname, "..", "dashboard", "dist");
if (fs.existsSync(dashboardDist)) {
  app.use(express.static(dashboardDist));
  // Express 5's path-to-regexp no longer accepts a bare "*" route pattern —
  // a plain middleware catch-all sidesteps that entirely.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(dashboardDist, "index.html"));
  });
}

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`[admin-server] listening on http://localhost:${PORT}`);
  if (!fs.existsSync(dashboardDist)) {
    console.log(`[admin-server] dashboard/dist not built yet — API-only mode. Run "npm run build" in dashboard/.`);
  }
});
