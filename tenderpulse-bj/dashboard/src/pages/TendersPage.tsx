import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  exportUrl,
  fetchTenders,
  hideTender,
  restoreTender,
  sendSelectedTenders,
  updateTender,
  type Tender,
} from "../api";
import { CategoryChip, DeadlineBadge } from "../components/Chip";
import { TenderDrawer } from "../components/TenderDrawer";

const PAGE_SIZE = 25;
const FILTER_KEY = "tenderpulse.filters";

interface QuickFilter {
  key: string;
  label: string;
  apply: () => { deadlineFrom?: string; deadlineTo?: string };
}

const now = () => new Date();
const iso = (d: Date) => d.toISOString();

const QUICK_FILTERS: QuickFilter[] = [
  { key: "urgent", label: "Due in 2 days", apply: () => ({ deadlineFrom: iso(now()), deadlineTo: iso(new Date(Date.now() + 2 * 86400000)) }) },
  { key: "week", label: "Due this week", apply: () => ({ deadlineFrom: iso(now()), deadlineTo: iso(new Date(Date.now() + 7 * 86400000)) }) },
  { key: "month", label: "Due this month", apply: () => ({ deadlineFrom: iso(now()), deadlineTo: iso(new Date(Date.now() + 30 * 86400000)) }) },
];

function loadSavedFilters() {
  try {
    return JSON.parse(localStorage.getItem(FILTER_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function TendersPage() {
  const saved = loadSavedFilters();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState(saved.q || "");
  const [category, setCategory] = useState(saved.category || "");
  const [district, setDistrict] = useState(saved.district || "");
  const [state, setState] = useState(saved.state || "");
  const [sortBy, setSortBy] = useState(saved.sortBy || "bid_submission_deadline");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(saved.sortDir || "asc");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [emailTarget, setEmailTarget] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [bulkCategory, setBulkCategory] = useState("");
  const [activeTender, setActiveTender] = useState<Tender | null>(null);

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ q, category, district, state, sortBy, sortDir }));
  }, [q, category, district, state, sortBy, sortDir]);

  async function load() {
    setLoading(true);
    try {
      const quick = activeQuickFilter ? QUICK_FILTERS.find((f) => f.key === activeQuickFilter)?.apply() : {};
      const res = await fetchTenders({
        q,
        category,
        district,
        state,
        sortBy,
        sortDir,
        page,
        pageSize: PAGE_SIZE,
        includeHidden: includeHidden ? "1" : undefined,
        ...quick,
      } as any);
      setTenders(res.tenders);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortBy, sortDir, category, district, state, includeHidden, activeQuickFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === tenders.length ? new Set() : new Set(tenders.map((t) => t.id))));
  }

  function toggleSort(field: string) {
    if (sortBy === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(field);
      setSortDir("asc");
    }
  }

  async function handleHide(id: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    if (tenders.find((t) => t.id === id)?.is_hidden) await restoreTender(id);
    else await hideTender(id);
    load();
  }

  async function handleCategoryChange(id: string, newCategory: string) {
    setTenders((prev) => prev.map((t) => (t.id === id ? { ...t, category: newCategory } : t)));
    await updateTender(id, { category: newCategory as any });
  }

  async function handleSendSelected() {
    if (!emailTarget || !selected.size) return;
    setSending(true);
    setNotice(null);
    try {
      const result = await sendSelectedTenders(emailTarget, Array.from(selected));
      setNotice(result.sent ? `Sent ${selected.size} tenders to ${emailTarget}` : `Failed: ${result.error}`);
    } finally {
      setSending(false);
    }
  }

  async function handleBulkHide() {
    await Promise.all(Array.from(selected).map((id) => hideTender(id)));
    setSelected(new Set());
    load();
  }

  async function handleBulkCategory() {
    if (!bulkCategory) return;
    await Promise.all(Array.from(selected).map((id) => updateTender(id, { category: bulkCategory as any })));
    setBulkCategory("");
    setSelected(new Set());
    load();
  }

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Tenders</h1>
        <p className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          {total} tender{total === 1 ? "" : "s"} tracked across Bihar &amp; Jharkhand sources.
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-surface dark:bg-surface-dark border border-grid dark:border-grid-dark rounded-xl p-3 flex flex-col gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: try a category, district, keyword, or a whole sentence like 'construction tenders in Gaya above 5 lakh'"
          className="w-full rounded-lg border border-grid dark:border-grid-dark bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-series-1/40"
        />

        {/* Quick filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveQuickFilter(activeQuickFilter === f.key ? null : f.key)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                activeQuickFilter === f.key
                  ? "bg-series-1 text-white border-series-1"
                  : "border-grid dark:border-grid-dark text-ink-secondary dark:text-ink-secondary-dark"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setIncludeHidden((v) => !v)}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              includeHidden
                ? "bg-status-critical text-white border-status-critical"
                : "border-grid dark:border-grid-dark text-ink-secondary dark:text-ink-secondary-dark"
            }`}
          >
            {includeHidden ? "Showing hidden" : "Show hidden"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-grid dark:border-grid-dark bg-transparent px-2 py-1.5 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded-lg border border-grid dark:border-grid-dark bg-transparent px-2 py-1.5 text-sm"
          >
            <option value="">All states</option>
            <option value="Bihar">Bihar</option>
            <option value="Jharkhand">Jharkhand</option>
            <option value="Central">Central (GeM)</option>
          </select>
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="District"
            className="w-32 rounded-lg border border-grid dark:border-grid-dark bg-transparent px-2 py-1.5 text-sm"
          />
          {(category || state || district || q || activeQuickFilter) && (
            <button
              onClick={() => {
                setCategory("");
                setState("");
                setDistrict("");
                setQ("");
                setActiveQuickFilter(null);
              }}
              className="text-sm text-series-1 px-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-secondary dark:text-ink-secondary-dark">
          {selected.size ? `${selected.size} selected` : "Select rows to export, email, or bulk-edit"}
        </span>
        <div className="flex-1" />
        {selected.size > 0 && (
          <>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="rounded-lg border border-grid dark:border-grid-dark bg-transparent px-2 py-1.5 text-xs"
            >
              <option value="">Set category…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
            {bulkCategory && (
              <button onClick={handleBulkCategory} className="text-xs px-2 py-1.5 rounded-lg bg-series-1 text-white">
                Apply
              </button>
            )}
            <button onClick={handleBulkHide} className="text-xs px-2 py-1.5 rounded-lg border border-grid dark:border-grid-dark text-status-critical">
              Hide selected
            </button>
          </>
        )}
        <ExportButtons ids={selectedIds} />
        {selected.size > 0 && (
          <div className="flex items-center gap-1 w-full sm:w-auto mt-2 sm:mt-0">
            <input
              value={emailTarget}
              onChange={(e) => setEmailTarget(e.target.value)}
              placeholder="client@company.com"
              className="rounded-lg border border-grid dark:border-grid-dark bg-transparent px-2 py-1.5 text-sm flex-1"
            />
            <button
              disabled={sending || !emailTarget}
              onClick={handleSendSelected}
              className="rounded-lg bg-series-1 text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              {sending ? "Sending…" : "Email selected"}
            </button>
          </div>
        )}
      </div>
      {notice && <div className="text-sm rounded-lg bg-series-2/10 text-series-2 px-3 py-2">{notice}</div>}

      {/* Desktop table */}
      <div className="hidden md:block bg-surface dark:bg-surface-dark border border-grid dark:border-grid-dark rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-grid dark:border-grid-dark text-left text-ink-muted">
              <th className="p-3 w-8">
                <input type="checkbox" checked={selected.size > 0 && selected.size === tenders.length} onChange={toggleSelectAll} />
              </th>
              <SortableTh label="Title" field="title" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} className="min-w-[280px]" />
              <SortableTh label="District" field="district" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <th className="p-3 font-medium">Category</th>
              <SortableTh label="Deadline" field="bid_submission_deadline" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <th className="p-3 font-medium">Source</th>
              <th className="p-3 font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenders.map((t) => (
              <tr
                key={t.id}
                onClick={() => setActiveTender(t)}
                className={`border-b border-grid/60 dark:border-grid-dark/60 last:border-0 hover:bg-ink-primary/[0.02] dark:hover:bg-white/[0.02] cursor-pointer ${t.is_hidden ? "opacity-50" : ""}`}
              >
                <td className="p-3 align-top" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} />
                </td>
                <td className="p-3 align-top max-w-[420px]">
                  <div className="font-medium leading-snug line-clamp-2">{t.title}</div>
                  <div className="text-xs text-ink-muted mt-0.5">{t.organization}</div>
                </td>
                <td className="p-3 align-top text-ink-secondary dark:text-ink-secondary-dark">{t.district || "—"}</td>
                <td className="p-3 align-top" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={t.category || "other"}
                    onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                    className="bg-transparent text-xs rounded border border-transparent hover:border-grid dark:hover:border-grid-dark px-1 py-0.5"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3 align-top">
                  <DeadlineBadge deadline={t.bid_submission_deadline} />
                </td>
                <td className="p-3 align-top text-xs text-ink-muted max-w-[160px] truncate" title={t.source_name}>
                  {t.source_name}
                </td>
                <td className="p-3 align-top" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2 text-xs">
                    {t.nit_document_url && (
                      <a href={t.nit_document_url} target="_blank" rel="noreferrer" className="text-series-1">
                        Doc
                      </a>
                    )}
                    <button onClick={(e) => handleHide(t.id, e)} className="text-status-critical">
                      {t.is_hidden ? "Restore" : "Hide"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && tenders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink-muted">
                  No tenders match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {tenders.map((t) => (
          <div
            key={t.id}
            onClick={() => setActiveTender(t)}
            className={`bg-surface dark:bg-surface-dark border border-grid dark:border-grid-dark rounded-xl p-3 ${t.is_hidden ? "opacity-50" : ""}`}
          >
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selected.has(t.id)}
                onChange={() => toggleSelect(t.id)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm leading-snug">{t.title}</div>
                <div className="text-xs text-ink-muted mt-0.5">{t.organization}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <CategoryChip category={t.category} />
                  {t.district && <span className="text-xs text-ink-secondary dark:text-ink-secondary-dark">{t.district}</span>}
                  <DeadlineBadge deadline={t.bid_submission_deadline} />
                </div>
                <div className="flex gap-3 mt-2 text-xs" onClick={(e) => e.stopPropagation()}>
                  {t.nit_document_url && (
                    <a href={t.nit_document_url} target="_blank" rel="noreferrer" className="text-series-1">
                      View document
                    </a>
                  )}
                  <button onClick={(e) => handleHide(t.id, e)} className="text-status-critical">
                    {t.is_hidden ? "Restore" : "Hide"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && tenders.length === 0 && (
          <div className="p-8 text-center text-ink-muted text-sm">No tenders match these filters.</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm pb-4">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1.5 rounded-lg border border-grid dark:border-grid-dark disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-ink-muted">
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 rounded-lg border border-grid dark:border-grid-dark disabled:opacity-40"
        >
          Next
        </button>
      </div>

      {activeTender && (
        <TenderDrawer tender={activeTender} onClose={() => setActiveTender(null)} onChanged={load} />
      )}
    </div>
  );
}

function SortableTh({
  label,
  field,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  field: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
  className?: string;
}) {
  const active = sortBy === field;
  return (
    <th className={`p-3 font-medium cursor-pointer select-none ${className || ""}`} onClick={() => onSort(field)}>
      <span className={active ? "text-ink-primary dark:text-ink-primary-dark" : ""}>{label}</span>
      {active && <span className="ml-1 text-series-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );
}

function ExportButtons({ ids }: { ids: string[] }) {
  const formats: { key: string; label: string }[] = [
    { key: "csv", label: "CSV" },
    { key: "xlsx", label: "XLSX" },
    { key: "pdf", label: "PDF" },
    { key: "docx", label: "DOC" },
  ];
  return (
    <div className="flex gap-1">
      {formats.map((f) => (
        <a
          key={f.key}
          href={exportUrl(f.key, ids)}
          className="text-xs px-2 py-1.5 rounded-lg border border-grid dark:border-grid-dark hover:bg-ink-primary/5 dark:hover:bg-white/5"
        >
          {f.label}
        </a>
      ))}
    </div>
  );
}
