'use client';

import { useMemo, useState } from 'react';
import { Building2, Lock, MapPin, Search, Sparkles } from 'lucide-react';

export type DemoTender = {
  id: string;
  title: string;
  organization: string | null;
  district: string | null;
  category: string | null;
  estimatedValueInr: number | null;
  deadline: string | null;
  sourceName: string | null;
  sourceState: string | null;
};

function formatINR(value: number | null): string {
  if (value == null || value <= 0) return 'Not disclosed';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

function daysLeft(deadline: string | null): { label: string; tone: 'bullish' | 'bearish' | 'neutral' } {
  if (!deadline) return { label: 'No deadline listed', tone: 'neutral' };
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: 'Deadline passed', tone: 'bearish' };
  if (days === 0) return { label: 'Closes today', tone: 'bearish' };
  if (days <= 3) return { label: `${days}d left`, tone: 'bearish' };
  if (days <= 10) return { label: `${days}d left`, tone: 'neutral' };
  return { label: `${days}d left`, tone: 'bullish' };
}

const TONE_CLASS: Record<string, string> = {
  bullish: 'border-[rgba(61,122,92,0.35)] bg-[rgba(61,122,92,0.1)] text-[var(--status-closed)]',
  bearish: 'border-[rgba(154,82,82,0.35)] bg-[rgba(154,82,82,0.1)] text-[#9a5252]',
  neutral: 'border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-tertiary)]',
};

type SortKey = 'deadline' | 'value_desc';

export default function TenderPulseDemoExplorer({ tenders }: { tenders: DemoTender[] }) {
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('all');
  const [category, setCategory] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('deadline');

  const districts = useMemo(
    () => Array.from(new Set(tenders.map((t) => t.district).filter((d): d is string => !!d))).sort(),
    [tenders]
  );
  const categories = useMemo(
    () => Array.from(new Set(tenders.map((t) => t.category).filter((c): c is string => !!c))).sort(),
    [tenders]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = tenders.filter((t) => {
      if (district !== 'all' && t.district !== district) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.organization ?? '').toLowerCase().includes(q) ||
        (t.district ?? '').toLowerCase().includes(q)
      );
    });
    const sorted = [...rows];
    if (sortKey === 'value_desc') {
      sorted.sort((a, b) => (b.estimatedValueInr ?? 0) - (a.estimatedValueInr ?? 0));
    } else {
      sorted.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    }
    return sorted;
  }, [tenders, search, district, category, sortKey]);

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
            placeholder="Search title, department, district..."
            className="w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-elevated)] py-1.5 pl-9 pr-3 type-caption text-[var(--text-primary)] outline-none focus:border-[var(--gold-base)]"
          />
        </div>
        <select value={district} onChange={(e) => setDistrict(e.target.value)} className={selectClass}>
          <option value="all">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className={selectClass}>
          <option value="deadline">Sort: deadline soonest</option>
          <option value="value_desc">Sort: value highest</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 text-center type-body text-[var(--text-tertiary)]">
          No open tenders in this sample match those filters - the live tracker has many more.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((t) => {
            const dl = daysLeft(t.deadline);
            return (
              <div key={t.id} className="rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="type-heading text-[var(--text-primary)]">{t.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-[var(--text-tertiary)]">
                      {t.organization && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {t.organization}
                        </span>
                      )}
                      {t.district && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {t.district}
                        </span>
                      )}
                      {t.category && <span className="capitalize">{t.category.replace(/_/g, ' ')}</span>}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 type-caption font-semibold ${TONE_CLASS[dl.tone]}`}>{dl.label}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="type-body font-semibold text-[var(--text-primary)]">{formatINR(t.estimatedValueInr)}</span>
                    {t.sourceName && (
                      <span className="type-caption text-[var(--text-tertiary)]">
                        {t.sourceName}
                        {t.sourceState ? ` · ${t.sourceState}` : ''}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] px-2.5 py-1 type-caption text-[var(--text-tertiary)]">
                    <Lock className="h-3 w-3" />
                    AI eligibility check - customers only
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 type-caption text-[var(--text-tertiary)]">
        <Sparkles className="h-3.5 w-3.5" />
        Every tender here also gets an AI-written plain-language summary and eligibility check for customers - hidden in this demo.
      </p>
    </div>
  );
}
