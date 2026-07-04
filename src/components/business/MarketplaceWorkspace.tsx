'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, ImagePlus, Loader2, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';
import {
  computeMarketplaceQuote,
  MARKETPLACE_LABELS,
  MARKETPLACE_OPTIONS,
  type MarketplaceOption,
} from '@/lib/marketplace-pricing';
import { useCompanyPortalState } from '@/hooks/useCompanyPortalState';

type DraftProduct = {
  key: string;
  productName: string;
  description: string;
  category: string;
  tags: string;
  imageUrls: string[];
  uploading: boolean;
};

type RequestProduct = {
  id: string;
  product_name: string;
  category: string | null;
  tags: string[];
  image_urls: string[];
  marketplace_status: Record<string, string>;
};

type MarketplaceRequest = {
  id: string;
  marketplaces: string[];
  addon_photography: boolean;
  addon_tagging: boolean;
  product_count: number;
  total_amount: number;
  payment_status: string;
  status: string;
  admin_notes: string | null;
  razorpay_payment_link_url: string | null;
  created_at: string;
  products: RequestProduct[];
};

function newDraftProduct(): DraftProduct {
  return { key: crypto.randomUUID(), productName: '', description: '', category: '', tags: '', imageUrls: [], uploading: false };
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-stone-500/15 text-stone-300' },
  in_progress: { label: 'In progress', className: 'bg-amber-500/15 text-amber-300' },
  listed: { label: 'Listed', className: 'bg-emerald-500/15 text-emerald-300' },
  rejected: { label: 'Rejected', className: 'bg-rose-500/15 text-rose-300' },
};

export default function MarketplaceWorkspace() {
  const portal = useCompanyPortalState();
  const [marketplaces, setMarketplaces] = useState<MarketplaceOption[]>(['amazon']);
  const [addonPhotography, setAddonPhotography] = useState(false);
  const [addonTagging, setAddonTagging] = useState(false);
  const [products, setProducts] = useState<DraftProduct[]>([newDraftProduct()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requests, setRequests] = useState<MarketplaceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [discountPct, setDiscountPct] = useState(0);

  const loadRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/business/marketplace');
      const json = await res.json() as { requests?: MarketplaceRequest[]; discountPct?: number };
      setRequests(json.requests ?? []);
      setDiscountPct(json.discountPct ?? 0);
    } catch { /* ignore */ } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
    const interval = window.setInterval(() => void loadRequests(), 30000);
    return () => window.clearInterval(interval);
  }, [loadRequests]);

  const quote = useMemo(() => computeMarketplaceQuote({
    productCount: products.filter(p => p.productName.trim()).length,
    marketplaceCount: marketplaces.length,
    addonPhotography,
    addonTagging,
    discountPct,
  }), [products, marketplaces, addonPhotography, addonTagging, discountPct]);

  function toggleMarketplace(m: MarketplaceOption) {
    setMarketplaces(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  function updateProduct(key: string, patch: Partial<DraftProduct>) {
    setProducts(prev => prev.map(p => p.key === key ? { ...p, ...patch } : p));
  }

  function removeProduct(key: string) {
    setProducts(prev => prev.length > 1 ? prev.filter(p => p.key !== key) : prev);
  }

  async function handleImageUpload(key: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    updateProduct(key, { uploading: true });
    const results = await Promise.all(Array.from(files).slice(0, 6).map(async (file, i) => {
      const fileName = `marketplace/${Date.now()}-${i}-${file.name}`;
      const { error } = await supabase.storage.from('vault').upload(fileName, file);
      if (error) return null;
      const { data: { publicUrl } } = supabase.storage.from('vault').getPublicUrl(fileName);
      return publicUrl;
    }));
    const uploaded = results.filter((url): url is string => Boolean(url));
    setProducts(prev => prev.map(p => p.key === key ? { ...p, imageUrls: [...p.imageUrls, ...uploaded], uploading: false } : p));
  }

  async function handleSubmit() {
    setSubmitError(null);
    const validProducts = products.filter(p => p.productName.trim());
    if (validProducts.length === 0) {
      setSubmitError('Add at least one product with a name.');
      return;
    }
    if (marketplaces.length === 0) {
      setSubmitError('Select at least one marketplace.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/business/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketplaces,
          addonPhotography,
          addonTagging,
          products: validProducts.map(p => ({
            productName: p.productName.trim(),
            description: p.description.trim(),
            category: p.category.trim(),
            tags: p.tags.split(',').map(t => t.trim()).filter(Boolean),
            imageUrls: p.imageUrls,
          })),
        }),
      });
      const json = await res.json() as { success?: boolean; checkoutUrl?: string; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed to submit request');

      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }

      setProducts([newDraftProduct()]);
      await loadRequests();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className={`${styles.panel} p-6 md:p-8`}>
        <div className="type-subheading text-[var(--text-tertiary)]">Marketplace Listings</div>
        <h1 className="mt-3 type-hero text-[var(--text-primary)]">Get listed on Amazon, Flipkart & Meesho</h1>
        <p className="mt-3 max-w-3xl type-body text-[var(--text-secondary)]">
          Submit your products once — our team handles the listing, photography, and tagging across every marketplace you pick.
          {quote.discountPct > 0 && ` Your ${portal.planName} plan includes a ${Math.round(quote.discountPct * 100)}% discount on listing fees.`}
        </p>
      </div>

      <div className={`${styles.panel} p-6 space-y-5`}>
        <div>
          <div className="mb-2 type-label uppercase text-[var(--text-tertiary)]">Marketplaces</div>
          <div className="flex flex-wrap gap-2">
            {MARKETPLACE_OPTIONS.map(m => (
              <button
                key={m}
                onClick={() => toggleMarketplace(m)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  marketplaces.includes(m)
                    ? 'border-[var(--gold-base)] bg-[var(--gold-glow)] text-[var(--gold-bright)]'
                    : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                {MARKETPLACE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={addonPhotography} onChange={(e) => setAddonPhotography(e.target.checked)} />
            <Camera className="h-4 w-4" /> Product photography (+₹299/product)
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={addonTagging} onChange={(e) => setAddonTagging(e.target.checked)} />
            <Tag className="h-4 w-4" /> SEO tagging & keywords (+₹99/product)
          </label>
        </div>

        <div className="space-y-4">
          <div className="type-label uppercase text-[var(--text-tertiary)]">Products</div>
          {products.map((p) => (
            <div key={p.key} className="rounded-2xl border border-[var(--border-default)] p-4 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  value={p.productName}
                  onChange={(e) => updateProduct(p.key, { productName: e.target.value })}
                  placeholder="Product name"
                  className="flex-1 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                />
                <button onClick={() => removeProduct(p.key)} className="rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={p.category}
                  onChange={(e) => updateProduct(p.key, { category: e.target.value })}
                  placeholder="Category (e.g. Home & Kitchen)"
                  className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                />
                <input
                  value={p.tags}
                  onChange={(e) => updateProduct(p.key, { tags: e.target.value })}
                  placeholder="Tags, comma separated"
                  className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
                />
              </div>
              <textarea
                value={p.description}
                onChange={(e) => updateProduct(p.key, { description: e.target.value })}
                placeholder="Short description"
                rows={2}
                className="w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-sm outline-none focus:border-[var(--border-focus)]"
              />
              <div className="flex flex-wrap items-center gap-2">
                {p.imageUrls.map((url) => (
                  <img key={url} src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ))}
                <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)]">
                  {p.uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(p.key, e.target.files)} />
                </label>
              </div>
            </div>
          ))}
          <button
            onClick={() => setProducts(prev => [...prev, newDraftProduct()])}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
          >
            <Plus className="h-4 w-4" /> Add another product
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--gold-base)]/30 bg-[var(--gold-glow)] p-4">
          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>Listing subtotal</span>
            <span>₹{quote.subtotal.toLocaleString('en-IN')}</span>
          </div>
          {quote.discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span>Plan discount ({Math.round(quote.discountPct * 100)}%)</span>
              <span>-₹{quote.discountAmount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-[var(--border-default)] pt-2 text-lg font-semibold text-[var(--text-primary)]">
            <span>Total</span>
            <span>₹{quote.total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {submitError && <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{submitError}</div>}

        <button
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="w-full rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)] disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : quote.total > 0 ? `Submit & pay ₹${quote.total.toLocaleString('en-IN')}` : 'Submit request'}
        </button>
      </div>

      <div className={`${styles.panel} p-6`}>
        <h2 className="type-heading text-[var(--text-primary)]">Your requests</h2>
        {loadingRequests ? (
          <div className="mt-6 text-center text-[var(--text-secondary)]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="mt-6 text-center text-[var(--text-secondary)]">No marketplace listing requests yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-[var(--border-default)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="type-label uppercase text-[var(--text-tertiary)]">
                      {r.marketplaces.map(m => MARKETPLACE_LABELS[m as MarketplaceOption] ?? m).join(', ')}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">{r.product_count} product(s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                      r.payment_status === 'paid' ? 'bg-emerald-500/15 text-emerald-300'
                        : r.payment_status === 'failed' ? 'bg-rose-500/15 text-rose-300'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {r.payment_status === 'paid' ? 'Paid' : r.payment_status === 'failed' ? 'Payment failed' : 'Awaiting payment'}
                    </span>
                    <span className="rounded-full bg-[var(--bg-overlay)] px-2.5 py-0.5 text-xs font-semibold uppercase text-[var(--text-tertiary)]">
                      {r.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {r.payment_status !== 'paid' && r.razorpay_payment_link_url && (
                  <a href={r.razorpay_payment_link_url} className="mt-2 inline-block text-sm font-semibold text-[var(--gold-bright)] underline">
                    Complete payment
                  </a>
                )}
                <div className="mt-3 space-y-2">
                  {r.products.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--bg-overlay)] px-3 py-2 text-sm">
                      <span className="text-[var(--text-primary)]">{p.product_name}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(p.marketplace_status).map(([m, status]) => (
                          <span key={m} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_META[status]?.className ?? 'bg-stone-500/15 text-stone-300'}`}>
                            {MARKETPLACE_LABELS[m as MarketplaceOption] ?? m}: {STATUS_META[status]?.label ?? status}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {r.admin_notes && (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">Note from Levitate: {r.admin_notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
