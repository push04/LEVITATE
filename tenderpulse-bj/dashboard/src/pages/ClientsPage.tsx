import { useEffect, useState } from "react";
import {
  CATEGORIES,
  createClient,
  deleteClient,
  fetchClients,
  previewClientMatches,
  sendClientDigestNow,
  updateClient,
  type Client,
} from "../api";

const inputClass =
  "w-full rounded-lg border border-grid dark:border-grid-dark bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-series-1/40";

const emptyForm = {
  company_name: "",
  contact_name: "",
  email: "",
  phone_number: "",
  districts: "",
  categories: [] as string[],
  keywords: "",
  min_value: "",
  max_value: "",
  delivery_frequency: "daily" as Client["delivery_frequency"],
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [sendStatus, setSendStatus] = useState<Record<string, string>>({});

  async function load() {
    setClients(await fetchClients());
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(c: Client) {
    setEditingId(c.id);
    setForm({
      company_name: c.company_name,
      contact_name: c.contact_name || "",
      email: c.email,
      phone_number: c.phone_number || "",
      districts: c.districts.join(", "),
      categories: c.categories,
      keywords: c.keywords.join(", "),
      min_value: c.min_value?.toString() || "",
      max_value: c.max_value?.toString() || "",
      delivery_frequency: c.delivery_frequency,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      company_name: form.company_name,
      contact_name: form.contact_name || undefined,
      email: form.email,
      phone_number: form.phone_number || undefined,
      districts: splitList(form.districts),
      categories: form.categories as any,
      keywords: splitList(form.keywords),
      min_value: form.min_value ? Number(form.min_value) : undefined,
      max_value: form.max_value ? Number(form.max_value) : undefined,
      delivery_frequency: form.delivery_frequency,
    };
    try {
      if (editingId) await updateClient(editingId, payload);
      else await createClient(payload);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteClient(id);
    load();
  }

  async function handlePreview(id: string) {
    const res = await previewClientMatches(id);
    setMatchCounts((prev) => ({ ...prev, [id]: res.count }));
  }

  async function handleSendNow(id: string) {
    setSendStatus((prev) => ({ ...prev, [id]: "sending" }));
    const res = await sendClientDigestNow(id);
    setSendStatus((prev) => ({
      ...prev,
      [id]: res.sent ? `Sent ${res.tenderCount} tenders` : res.reason || res.error || "Failed",
    }));
  }

  function toggleCategory(c: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c],
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Clients</h1>
        <p className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          Companies you deliver curated tenders to, with per-client filters for automatic email digests.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface dark:bg-surface-dark border border-grid dark:border-grid-dark rounded-xl p-4 space-y-3"
      >
        <div className="font-medium text-sm">{editingId ? "Edit client" : "Add a new client"}</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Company name">
            <input
              required
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Contact name">
            <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Phone (optional)">
            <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Districts (comma separated, blank = all)">
            <input value={form.districts} onChange={(e) => setForm({ ...form, districts: e.target.value })} className={inputClass} placeholder="Patna, Gaya" />
          </Field>
          <Field label="Keywords (comma separated)">
            <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className={inputClass} placeholder="road, drainage" />
          </Field>
          <Field label="Min value (INR, optional)">
            <input type="number" value={form.min_value} onChange={(e) => setForm({ ...form, min_value: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Max value (INR, optional)">
            <input type="number" value={form.max_value} onChange={(e) => setForm({ ...form, max_value: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Delivery frequency">
            <select
              value={form.delivery_frequency}
              onChange={(e) => setForm({ ...form, delivery_frequency: e.target.value as Client["delivery_frequency"] })}
              className={inputClass}
            >
              <option value="instant">Instant</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </Field>
        </div>
        <div>
          <div className="text-xs text-ink-muted mb-1">Categories (blank = all)</div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => toggleCategory(c)}
                className={`text-xs px-2 py-1 rounded-full border ${
                  form.categories.includes(c)
                    ? "bg-series-1 text-white border-series-1"
                    : "border-grid dark:border-grid-dark text-ink-secondary dark:text-ink-secondary-dark"
                }`}
              >
                {c.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button disabled={saving} type="submit" className="rounded-lg bg-series-1 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
            {saving ? "Saving…" : editingId ? "Save changes" : "Add client"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-lg border border-grid dark:border-grid-dark px-4 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {clients.map((c) => (
          <div key={c.id} className="bg-surface dark:bg-surface-dark border border-grid dark:border-grid-dark rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{c.company_name}</div>
                <div className="text-xs text-ink-muted">{c.email}{c.contact_name ? ` · ${c.contact_name}` : ""}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.categories.map((cat) => (
                    <span key={cat} className="text-[11px] rounded-full bg-series-1/10 text-series-1 px-2 py-0.5">
                      {cat.replace("_", " ")}
                    </span>
                  ))}
                  {c.districts.map((d) => (
                    <span key={d} className="text-[11px] rounded-full bg-ink-muted/10 text-ink-secondary dark:text-ink-secondary-dark px-2 py-0.5">
                      {d}
                    </span>
                  ))}
                  <span className="text-[11px] rounded-full bg-series-2/10 text-series-2 px-2 py-0.5">{c.delivery_frequency}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button onClick={() => handlePreview(c.id)} className="px-2 py-1 rounded border border-grid dark:border-grid-dark">
                  Preview matches{matchCounts[c.id] != null ? ` (${matchCounts[c.id]})` : ""}
                </button>
                <button onClick={() => handleSendNow(c.id)} className="px-2 py-1 rounded bg-series-1 text-white">
                  Send now
                </button>
                <button onClick={() => startEdit(c)} className="px-2 py-1 rounded border border-grid dark:border-grid-dark">
                  Edit
                </button>
                <button onClick={() => handleDelete(c.id)} className="px-2 py-1 rounded border border-grid dark:border-grid-dark text-status-critical">
                  Delete
                </button>
              </div>
            </div>
            {sendStatus[c.id] && <div className="text-xs text-ink-muted mt-2">{sendStatus[c.id]}</div>}
          </div>
        ))}
        {clients.length === 0 && <div className="text-sm text-ink-muted">No clients yet — add one above.</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-ink-muted mb-1">{label}</div>
      {children}
    </label>
  );
}

function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
