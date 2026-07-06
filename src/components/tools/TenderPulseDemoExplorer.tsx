'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, KeyRound, Loader2, Lock, Mail, MapPin, MessageCircle, Search, Sparkles } from 'lucide-react';
import { exportDemoResultsCSV, exportDemoResultsPDF } from '@/lib/public-demo-export';

type DemoTender = {
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

const EXAMPLES = ['civil works tenders in Ranchi', 'health department tenders above 10 lakh', 'IT tenders, soonest deadline first'];
const CODE_STORAGE_KEY = 'levitate_demo_invite_code';

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

export default function TenderPulseDemoExplorer() {
  const searchParams = useSearchParams();

  const [code, setCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState('');
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DemoTender[] | null>(null);
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
    if (fromUrl) {
      void redeem(fromUrl);
      return;
    }
    try {
      const saved = sessionStorage.getItem(CODE_STORAGE_KEY);
      if (saved) void redeem(saved);
    } catch {
      /* non-fatal */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runQuery = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/tenderpulse-demo', {
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
      setResults(data.results);
      setFellBack(data.fellBack);
      setTriesUsed(data.triesUsed);
      setTriesLimit(data.triesLimit);
      if (data.triesUsed >= data.triesLimit) setLimitReached(true);
    } catch {
      setError('Could not reach the server - try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportRows = (results ?? []).map((t) => ({
    Title: t.title,
    Organization: t.organization ?? '',
    District: t.district ?? '',
    Category: t.category ?? '',
    'Estimated value': formatINR(t.estimatedValueInr),
    Deadline: t.deadline ? new Date(t.deadline).toLocaleDateString('en-IN') : '',
    Source: t.sourceName ?? '',
  }));

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
            To get every matching tender delivered daily with AI eligibility notes, email us or get in touch - we&rsquo;ll
            set your business up properly.
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
                placeholder='e.g. "civil works tenders in Ranchi"'
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
                  No exact match for that - here&rsquo;s a real sample of what&rsquo;s currently open. Try a different
                  district or category.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="type-caption text-[var(--text-tertiary)]">{results.length} result{results.length === 1 ? '' : 's'}</p>
                {results.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => exportDemoResultsCSV(exportRows, 'tenderpulse-demo')}
                      className="rounded-lg border border-[var(--border-default)] px-2.5 py-1 type-caption text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => exportDemoResultsPDF(exportRows, 'TenderPulse demo results', 'tenderpulse-demo')}
                      className="rounded-lg border border-[var(--border-default)] px-2.5 py-1 type-caption text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                    >
                      Export PDF
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-3">
                {results.map((t) => {
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
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="type-body font-semibold text-[var(--text-primary)]">{formatINR(t.estimatedValueInr)}</span>
                        {t.sourceName && (
                          <span className="type-caption text-[var(--text-tertiary)]">
                            {t.sourceName}
                            {t.sourceState ? ` · ${t.sourceState}` : ''}
                          </span>
                        )}
                        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-overlay)] px-2.5 py-1 type-caption text-[var(--text-tertiary)]">
                          <Lock className="h-3 w-3" />
                          AI eligibility check - customers only
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
