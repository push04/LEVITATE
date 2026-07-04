'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShoppingBag } from 'lucide-react';
import { MARKETPLACE_LABELS, MARKETPLACE_OPTIONS, type MarketplaceOption } from '@/lib/marketplace-pricing';

type Product = {
  id: string;
  product_name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  image_urls: string[];
  marketplace_status: Record<string, string>;
};

type MarketplaceRequest = {
  id: string;
  companyName: string;
  marketplaces: string[];
  addon_photography: boolean;
  addon_tagging: boolean;
  product_count: number;
  total_amount: number;
  payment_status: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  products: Product[];
};

const REQUEST_STATUS_OPTIONS = ['submitted', 'in_progress', 'completed', 'rejected'];
const PRODUCT_STATUS_OPTIONS = ['pending', 'in_progress', 'listed', 'rejected'];

export default function AdminMarketplacePage() {
  const [requests, setRequests] = useState<MarketplaceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/marketplace');
    const json = await res.json() as { requests?: MarketplaceRequest[] };
    setRequests(json.requests ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateRequestStatus(id: string, status: string) {
    setSavingId(id);
    await fetch(`/api/admin/marketplace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
    setSavingId(null);
  }

  async function updateAdminNotes(id: string, adminNotes: string) {
    await fetch(`/api/admin/marketplace/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminNotes }),
    });
  }

  async function updateProductStatus(productId: string, marketplace: MarketplaceOption, status: string) {
    setSavingId(productId);
    await fetch(`/api/admin/marketplace/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketplace, status }),
    });
    await load();
    setSavingId(null);
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-[#B08D57]" />
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Listings</h1>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">No marketplace listing requests yet.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-gray-900">{r.companyName}</p>
                  <p className="mt-0.5 text-[12px] text-gray-400">
                    {r.marketplaces.map(m => MARKETPLACE_LABELS[m as MarketplaceOption] ?? m).join(', ')} · {r.product_count} product(s) · ₹{r.total_amount.toLocaleString('en-IN')}
                    {r.addon_photography && ' · Photography'}
                    {r.addon_tagging && ' · Tagging'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${r.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {r.payment_status === 'paid' ? 'Paid' : 'Awaiting payment'}
                  </span>
                  <select
                    value={r.status}
                    disabled={savingId === r.id}
                    onChange={(e) => void updateRequestStatus(r.id, e.target.value)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] font-semibold text-gray-700"
                  >
                    {REQUEST_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {r.products.map((p) => (
                  <div key={p.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-medium text-gray-800">{p.product_name}</p>
                        {p.category && <p className="text-[11px] text-gray-400">{p.category}</p>}
                        {p.tags.length > 0 && <p className="text-[11px] text-gray-400">Tags: {p.tags.join(', ')}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {r.marketplaces.map((m) => (
                          <select
                            key={m}
                            value={p.marketplace_status[m] ?? 'pending'}
                            disabled={savingId === p.id}
                            onChange={(e) => void updateProductStatus(p.id, m as MarketplaceOption, e.target.value)}
                            className="rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-700"
                          >
                            {PRODUCT_STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{MARKETPLACE_LABELS[m as MarketplaceOption]}: {s.replace('_', ' ')}</option>
                            ))}
                          </select>
                        ))}
                      </div>
                    </div>
                    {p.image_urls.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {p.image_urls.map((url) => <img key={url} src={url} alt="" className="h-12 w-12 rounded object-cover" />)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <textarea
                defaultValue={r.admin_notes ?? ''}
                onBlur={(e) => void updateAdminNotes(r.id, e.target.value)}
                placeholder="Internal note visible to the business (e.g. delays, doc requests)…"
                rows={2}
                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] text-gray-700 outline-none focus:border-[#B08D57]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
