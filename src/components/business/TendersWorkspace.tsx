'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Calendar, ExternalLink, IndianRupee, Loader2, MapPin, Search } from 'lucide-react';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';

interface Tender {
  id: string;
  title: string;
  organization: string | null;
  district: string | null;
  category: string | null;
  estimated_value_inr: number | null;
  emd_amount_inr: number | null;
  publish_date: string | null;
  bid_submission_deadline: string | null;
  nit_document_url: string | null;
  ai_summary: string | null;
  ai_eligibility_notes: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  civil_works: 'Civil Works',
  supply: 'Supply',
  services: 'Services',
  it: 'IT',
  mining: 'Mining',
  health: 'Health',
  education: 'Education',
  other: 'Other',
};

function formatInr(value: number | null) {
  if (!value) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

function daysLeft(deadline: string | null) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function TendersWorkspace() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [district, setDistrict] = useState('');
  const [category, setCategory] = useState('');
  const [keyword, setKeyword] = useState('');

  const load = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pageNum) });
      if (district) params.set('district', district);
      if (category) params.set('category', category);
      if (keyword) params.set('keyword', keyword);
      const res = await fetch(`/api/business/tenders?${params}`);
      const json = await res.json() as { data?: Tender[]; total?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Failed to load tenders');
      setTenders(json.data ?? []);
      setTotal(json.total ?? 0);
      setPage(pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tenders');
    } finally {
      setLoading(false);
    }
  }, [district, category, keyword]);

  useEffect(() => { void load(1); }, [load]);

  return (
    <div className="space-y-6">
      <div className={`${styles.panel} p-6 md:p-8`}>
        <div className="type-subheading text-[var(--text-tertiary)]">Government Tenders</div>
        <h1 className="mt-3 type-hero text-[var(--text-primary)]">Live tender discovery</h1>
        <p className="mt-3 max-w-3xl type-body text-[var(--text-secondary)]">
          Government tenders scraped and matched to your industry and district — updated continuously. {total.toLocaleString('en-IN')} open tenders available.
        </p>
      </div>

      <div className={`${styles.panel} p-5`}>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(1)}
              placeholder="Search title, organization…"
              className="w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-input)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
            />
          </div>
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
            placeholder="District"
            className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => load(1)}
          className="mt-3 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-4 py-2 text-sm font-semibold text-[var(--text-inverse)]"
        >
          Apply filters
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className={`${styles.panel} p-12 text-center text-[var(--text-secondary)]`}>
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </div>
      ) : tenders.length === 0 ? (
        <div className={`${styles.panel} p-12 text-center text-[var(--text-secondary)]`}>
          No tenders match your filters right now.
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map((t) => {
            const left = daysLeft(t.bid_submission_deadline);
            return (
              <div key={t.id} className={`${styles.panel} p-5`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {t.category && (
                        <span className="rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-2.5 py-0.5 type-label uppercase text-[var(--gold-bright)]">
                          {CATEGORY_LABELS[t.category] ?? t.category}
                        </span>
                      )}
                      {left !== null && (
                        <span className={`rounded-full px-2.5 py-0.5 type-label uppercase ${left <= 3 ? 'bg-red-500/15 text-red-400' : 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)]'}`}>
                          {left < 0 ? 'Closed' : left === 0 ? 'Closes today' : `${left}d left`}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 type-heading text-[var(--text-primary)]">{t.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                      {t.organization && (
                        <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {t.organization}</span>
                      )}
                      {t.district && (
                        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {t.district}</span>
                      )}
                      {t.estimated_value_inr ? (
                        <span className="flex items-center gap-1.5"><IndianRupee className="h-3.5 w-3.5" /> Est. {formatInr(t.estimated_value_inr)}</span>
                      ) : null}
                      {t.bid_submission_deadline && (
                        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Due {new Date(t.bid_submission_deadline).toLocaleDateString('en-IN')}</span>
                      )}
                    </div>
                    {t.ai_summary && (
                      <p className="mt-3 type-body text-[var(--text-secondary)]">{t.ai_summary}</p>
                    )}
                  </div>
                  {t.nit_document_url && (
                    <a
                      href={t.nit_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    >
                      Notice <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {total > 30 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-[var(--text-secondary)]">
                {((page - 1) * 30) + 1}–{Math.min(page * 30, total)} of {total.toLocaleString('en-IN')}
              </span>
              <div className="flex gap-2">
                <button onClick={() => load(page - 1)} disabled={page === 1 || loading} className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm disabled:opacity-40">Prev</button>
                <button onClick={() => load(page + 1)} disabled={page * 30 >= total || loading} className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
