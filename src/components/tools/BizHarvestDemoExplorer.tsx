'use client';

import { useMemo, useState } from 'react';
import { Globe, Lock, Search, Star } from 'lucide-react';

export type DemoLead = {
  id: string;
  name: string;
  city: string | null;
  category: string | null;
  source: string;
  rating: number | null;
  hasWebsite: boolean;
  phoneMasked: string | null;
  scrapedAt: string;
};

function timeAgo(str: string) {
  const diff = Date.now() - new Date(str).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function BizHarvestDemoExplorer({ leads }: { leads: DemoLead[] }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'yes' | 'no'>('all');

  const categories = useMemo(
    () => Array.from(new Set(leads.map((l) => l.category).filter((c): c is string => !!c))).sort(),
    [leads]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (category !== 'all' && l.category !== category) return false;
      if (websiteFilter === 'yes' && !l.hasWebsite) return false;
      if (websiteFilter === 'no' && l.hasWebsite) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        (l.city ?? '').toLowerCase().includes(q) ||
        (l.category ?? '').toLowerCase().includes(q)
      );
    });
  }, [leads, search, category, websiteFilter]);

  const selectClass =
    'rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-1.5 type-caption text-[var(--text-secondary)]';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, city, category..."
            className="w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-elevated)] py-1.5 pl-9 pr-3 type-caption text-[var(--text-primary)] outline-none focus:border-[var(--gold-base)]"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={websiteFilter} onChange={(e) => setWebsiteFilter(e.target.value as 'all' | 'yes' | 'no')} className={selectClass}>
          <option value="all">Website: any</option>
          <option value="yes">Has a website</option>
          <option value="no">No website (opportunity)</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 text-center type-body text-[var(--text-tertiary)]">
          No businesses in this sample match those filters - the full database has many more.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((l) => (
            <div key={l.id} className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="type-heading truncate text-[var(--text-primary)]">{l.name}</div>
                  <div className="type-caption text-[var(--text-tertiary)]">
                    {l.category ?? 'General'}
                    {l.city ? ` · ${l.city}` : ''}
                  </div>
                </div>
                {l.rating != null && (
                  <span className="flex shrink-0 items-center gap-1 type-caption text-[var(--text-secondary)]">
                    <Star className="h-3 w-3 fill-[var(--gold-base)] text-[var(--gold-base)]" />
                    {l.rating}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] px-2.5 py-1 type-caption text-[var(--text-tertiary)]">
                  <Lock className="h-3 w-3" />
                  {l.phoneMasked ?? 'No number on file'}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 type-caption ${
                    l.hasWebsite
                      ? 'border-[rgba(61,122,92,0.35)] bg-[rgba(61,122,92,0.1)] text-[var(--status-closed)]'
                      : 'border-[rgba(154,82,82,0.35)] bg-[rgba(154,82,82,0.1)] text-[#9a5252]'
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  {l.hasWebsite ? 'Has website' : 'No website'}
                </span>
                <span className="ml-auto type-caption text-[var(--text-tertiary)]">
                  {l.source} · {timeAgo(l.scrapedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
