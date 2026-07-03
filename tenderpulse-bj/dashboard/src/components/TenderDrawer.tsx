import { useEffect, useState } from "react";
import { CATEGORIES, hideTender, restoreTender, updateTender, type Tender } from "../api";
import { CategoryChip, DeadlineBadge } from "./Chip";

export function TenderDrawer({
  tender,
  onClose,
  onChanged,
}: {
  tender: Tender;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [category, setCategory] = useState(tender.category || "other");
  const [notes, setNotes] = useState(tender.notes || "");
  const [tags, setTags] = useState((tender.tags || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCategory(tender.category || "other");
    setNotes(tender.notes || "");
    setTags((tender.tags || []).join(", "));
    setSaved(false);
  }, [tender.id]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateTender(tender.id, {
        category: category as any,
        notes,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setSaved(true);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleHideToggle() {
    if (tender.is_hidden) await restoreTender(tender.id);
    else await hideTender(tender.id);
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end" role="dialog">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full sm:w-[440px] h-full bg-surface dark:bg-surface-dark border-l border-grid dark:border-grid-dark overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold leading-snug pr-4">{tender.title}</h2>
          <button onClick={onClose} className="text-ink-muted text-xl leading-none shrink-0">
            ×
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <CategoryChip category={category} />
          <DeadlineBadge deadline={tender.bid_submission_deadline} />
          {tender.is_hidden && <span className="text-xs px-2 py-0.5 rounded-full bg-status-critical/10 text-status-critical">Hidden</span>}
        </div>

        <dl className="text-sm space-y-2">
          <Row label="Organization" value={tender.organization} />
          <Row label="District" value={tender.district} />
          <Row label="State" value={tender.state} />
          <Row label="Reference No" value={tender.external_ref} />
          <Row label="Source" value={tender.source_name} />
          <Row label="First seen" value={new Date(tender.first_seen_at).toLocaleString()} />
          <Row label="Last seen" value={new Date(tender.last_seen_at).toLocaleString()} />
        </dl>

        {tender.nit_document_url && (
          <a
            href={tender.nit_document_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-series-1 underline"
          >
            Open NIT document →
          </a>
        )}

        <div className="border-t border-grid dark:border-grid-dark pt-4 space-y-3">
          <div className="text-xs font-medium text-ink-muted uppercase tracking-wide">Edit</div>
          <label className="block">
            <div className="text-xs text-ink-muted mb-1">Category</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-grid dark:border-grid-dark bg-transparent px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <div className="text-xs text-ink-muted mb-1">Tags (comma separated)</div>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-lg border border-grid dark:border-grid-dark bg-transparent px-3 py-2 text-sm"
              placeholder="priority, follow-up"
            />
          </label>
          <label className="block">
            <div className="text-xs text-ink-muted mb-1">Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-grid dark:border-grid-dark bg-transparent px-3 py-2 text-sm"
              placeholder="Internal notes about this tender…"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-series-1 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
            </button>
            <button
              onClick={handleHideToggle}
              className="rounded-lg border border-grid dark:border-grid-dark px-4 py-2 text-sm text-status-critical"
            >
              {tender.is_hidden ? "Restore" : "Hide"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-muted shrink-0">{label}</dt>
      <dd className="text-right truncate">{value || "—"}</dd>
    </div>
  );
}
