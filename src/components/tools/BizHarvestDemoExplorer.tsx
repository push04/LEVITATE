'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Globe, KeyRound, Loader2, Lock, Mail, MessageCircle, Search, Sparkles, Star } from 'lucide-react';
import { exportDemoResultsCSV, exportDemoResultsPDF } from '@/lib/public-demo-export';

type DemoLead = {
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

const EXAMPLES = ['restaurants in Patna with no website', 'top rated clinics in Vadodara', 'salons in Ahmedabad, sorted by rating'];
const CODE_STORAGE_KEY = 'levitate_demo_invite_code';

function timeAgo(str: string) {
  const days = Math.floor((Date.now() - new Date(str).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function BizHarvestDemoExplorer() {
  const searchParams = useSearchParams();

  const [initializing, setInitializing] = useState(true);
  const [code, setCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DemoLead[] | null>(null);
  const [fellBack, setFellBack] = useState(false);
  const [error, setError] = useState('');
  const [triesUsed, setTriesUsed] = useState(0);
  const [triesLimit, setTriesLimit] = useState(3);
  const [limitReached, setLimitReached] = useState(false);

  const redeem = async (candidate: string) => {
    if (!candidate.trim()) return;
    setGateLoading(true);
    setGateError('');
    try {
      const res = await fetch('/api/public/demo-invite/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: candidate }),
      });
      const data = await res.json();
      if (!data.valid) {
        setGateError(data.error ?? 'Invalid invite code');
        return;
      }
      setCode(data.code);
      setBusinessName(data.businessName);
      setContactName(data.contactName);
      try {
        sessionStorage.setItem(CODE_STORAGE_KEY, data.code);
      } catch {
        /* non-fatal */
      }
    } catch {
      setGateError('Could not reach the server - try again.');
    } finally {
      setGateLoading(false);
    }
  };

  useEffect(() => {
    const fromUrl = searchParams.get('invite');
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(CODE_STORAGE_KEY);
    } catch {
      /* non-fatal */
    }
    const candidate = fromUrl || saved;
    if (!candidate) {
      setInitializing(false);
      return;
    }
    void (async () => {
      await redeem(candidate);
      setInitializing(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initializing) {
    return (
      <div className="mx-auto max-w-md rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--gold-base)]" />
        <p className="mt-3 type-body text-[var(--text-secondary)]">Loading your demo...</p>
      </div>
    );
  }

  const runQuery = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/bizharvest-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, query: q }),
      });
      const data = await res.json();
      if (data.limitReached) {
        setLimitReached(true);
        setTriesUsed(data.triesUsed);
        setTriesLimit(data.triesLimit);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      // Note: even on the visitor's last allowed try, this branch still
      // shows their results - the paywall only appears once the server
      // actually blocks the *next* attempt (the `data.limitReached` branch
      // above), not the moment triesUsed reaches triesLimit.
      setResults(data.results);
      setFellBack(data.fellBack);
      setTriesUsed(data.triesUsed);
      setTriesLimit(data.triesLimit);
    } catch {
      setError('Could not reach the server - try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportRows = (results ?? []).map((l) => ({
    Name: l.name,
    Phone: l.phoneMasked ?? 'Not on file',
    City: l.city ?? '',
    Category: l.category ?? '',
    Rating: l.rating ?? '',
    Website: l.hasWebsite ? 'Yes' : 'No',
    Source: l.source,
    'Scraped': new Date(l.scrapedAt).toLocaleDateString('en-IN'),
  }));

  // ── Gate: no invite redeemed yet ─────────────────────────────────────
  if (!code) {
    return (
      <div className="mx-auto max-w-md rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 text-center">
        <KeyRound className="mx-auto h-8 w-8 text-[var(--gold-base)]" />
        <p className="mt-3 type-heading text-[var(--text-primary)]">Enter your invite code</p>
        <p className="mt-1.5 type-body text-[var(--text-secondary)]">
          This demo is by invite only. Don&rsquo;t have a code? Email{' '}
          <a href="mailto:pushpal@levitatelabs.online" className="text-[var(--gold-base)] hover:underline">
            pushpal@levitatelabs.online
          </a>{' '}
          for one.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void redeem(codeInput);
          }}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="e.g. ABCD1234"
            // text-[16px] (not the design system's smaller type-body) is
            // deliberate - anything under 16px makes iOS Safari auto-zoom
            // the viewport on focus, which is jarring on a code-entry field.
            className="flex-1 rounded-[8px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-3 py-3 text-center text-[16px] uppercase tracking-wider text-[var(--text-primary)] outline-none focus:border-[var(--gold-base)]"
          />
          <button
            type="submit"
            disabled={gateLoading || !codeInput.trim()}
            className="rounded-[8px] bg-[var(--gold-base)] px-5 py-3 type-body font-semibold text-[var(--text-inverse)] disabled:opacity-50"
          >
            {gateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
          </button>
        </form>
        {gateError && <p className="mt-2 type-caption text-[#c97a7a]">{gateError}</p>}
      </div>
    );
  }

  // ── Welcome + query interface ────────────────────────────────────────
  return (
    <div>
      <div className="rounded-[14px] border border-[rgba(201,165,90,0.3)] bg-[var(--gold-glow)] p-4">
        <p className="type-body text-[var(--text-primary)]">
          Welcome{contactName ? `, ${contactName}` : ''}
          {businessName ? ` from ${businessName}` : ''}! You have {Math.max(0, triesLimit - triesUsed)} of {triesLimit} free
          queries left.
        </p>
      </div>

      {limitReached ? (
        <div className="mt-4 rounded-[16px] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 text-center">
          <Lock className="mx-auto h-7 w-7 text-[var(--gold-base)]" />
          <p className="mt-3 type-heading text-[var(--text-primary)]">You&rsquo;ve used all {triesLimit} free queries</p>
          <p className="mt-1.5 max-w-md mx-auto type-body text-[var(--text-secondary)]">
            To get full, unlimited access to the real BizHarvest database, email us or get in touch - we&rsquo;ll set your
            business up properly.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:pushpal@levitatelabs.online"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-2.5 type-body font-semibold text-[var(--text-inverse)]"
            >
              <Mail className="h-4 w-4" /> Email pushpal@levitatelabs.online
            </a>
            <a
              href="/#contact"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-2.5 type-body font-semibold text-[var(--text-primary)]"
            >
              <MessageCircle className="h-4 w-4" /> Contact us
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {results === null &&
              EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setQuery(ex);
                    void runQuery(ex);
                  }}
                  className="rounded-full border border-[var(--border-default)] px-3 py-1.5 type-caption text-[var(--text-secondary)] hover:border-[var(--gold-base)] hover:text-[var(--gold-base)]"
                >
                  {ex}
                </button>
              ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runQuery(query);
            }}
            className="mt-3 flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='e.g. "restaurants in Patna with no website"'
                className="w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-elevated)] py-3 pl-10 pr-3 text-[16px] text-[var(--text-primary)] outline-none focus:border-[var(--gold-base)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center justify-center gap-2 rounded-[10px] bg-[var(--gold-base)] px-5 py-3 type-body font-semibold text-[var(--text-inverse)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Searching...' : 'Ask'}
            </button>
          </form>

          {error && <p className="mt-2 type-caption text-[#c97a7a]">{error}</p>}

          {results && (
            <div className="mt-6">
              {fellBack && (
                <p className="mb-3 type-caption text-[var(--text-tertiary)]">
                  No exact match for that - here&rsquo;s a real sample of what we do have. Try a different city or category.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="type-caption text-[var(--text-tertiary)]">{results.length} result{results.length === 1 ? '' : 's'}</p>
                {results.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => exportDemoResultsCSV(exportRows, 'bizharvest-demo')}
                      className="rounded-lg border border-[var(--border-default)] px-2.5 py-1 type-caption text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => exportDemoResultsPDF(exportRows, 'BizHarvest demo results', 'bizharvest-demo')}
                      className="rounded-lg border border-[var(--border-default)] px-2.5 py-1 type-caption text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                    >
                      Export PDF
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {results.map((l) => (
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
