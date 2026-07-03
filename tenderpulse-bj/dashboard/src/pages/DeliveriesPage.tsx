import { useEffect, useState } from "react";
import { fetchDeliveries, type Delivery } from "../api";

const STATUS_STYLE: Record<string, string> = {
  sent: "bg-status-good/10 text-status-good",
  failed: "bg-status-critical/10 text-status-critical",
  pending: "bg-status-warning/10 text-status-warning",
};

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    fetchDeliveries().then(setDeliveries);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Deliveries</h1>
        <p className="text-sm text-ink-secondary dark:text-ink-secondary-dark">
          Audit log of every email digest and export sent to clients.
        </p>
      </div>

      <div className="space-y-2">
        {deliveries.map((d) => (
          <div key={d.id} className="bg-surface dark:bg-surface-dark border border-grid dark:border-grid-dark rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {d.recipient_email || "—"} <span className="text-ink-muted font-normal">· {d.tender_ids.length} tenders · {d.channel}</span>
              </div>
              <div className="text-xs text-ink-muted">
                {new Date(d.created_at).toLocaleString()}
                {d.error_message ? ` — ${d.error_message}` : ""}
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${STATUS_STYLE[d.status] || ""}`}>{d.status}</span>
          </div>
        ))}
        {deliveries.length === 0 && <div className="text-sm text-ink-muted">No deliveries sent yet.</div>}
      </div>
    </div>
  );
}
