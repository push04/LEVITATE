import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase';
import TenderPulseDemoExplorer from '@/components/tools/TenderPulseDemoExplorer';

export const dynamic = 'force-static';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'TenderPulse Live Demo - Levitate Labs',
  description:
    'A live, invite-only look at TenderPulse, our Bihar and Jharkhand government tender tracker - ask it a question in plain English and get real, live tenders back.',
};

const DISTINCT_SAMPLE_CAP = 4000;

async function getTenderPulseStats() {
  const supabase = getServiceSupabase();

  // Same "not actually expired" definition as the query API (status alone
  // can lag reality) - keeps this stat consistent with what a query returns.
  const nowIso = new Date().toISOString();
  const notExpiredFilter = `bid_submission_deadline.is.null,bid_submission_deadline.gte.${nowIso}`;

  const [totalRes, sourcesRes, districtRes, categoryRes] = await Promise.all([
    supabase.from('tenders').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('is_hidden', false).or(notExpiredFilter),
    supabase.from('sources').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('tenders').select('district').eq('status', 'active').eq('is_hidden', false).or(notExpiredFilter).not('district', 'is', null).limit(DISTINCT_SAMPLE_CAP),
    supabase.from('tenders').select('category').eq('status', 'active').eq('is_hidden', false).or(notExpiredFilter).not('category', 'is', null).limit(DISTINCT_SAMPLE_CAP),
  ]);

  return {
    totalActive: totalRes.count ?? 0,
    activeSources: sourcesRes.count ?? 0,
    distinctDistricts: new Set((districtRes.data ?? []).map((r) => r.district)).size,
    distinctCategories: new Set((categoryRes.data ?? []).map((r) => r.category)).size,
  };
}

export default async function TenderPulseDemoPage() {
  const stats = await getTenderPulseStats();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--border-default)] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="type-subheading text-[var(--text-accent)]">Invite-only demo · TenderPulse</div>
          <h1 className="font-serif-display mt-4 text-[40px] leading-[1.05] tracking-tight text-[var(--text-primary)] md:text-[56px]">
            Ask for government tenders, in plain English.
          </h1>
          <p className="mt-6 max-w-2xl type-body text-[17px] leading-8 text-[var(--text-secondary)]">
            TenderPulse watches 70+ Bihar and Jharkhand government procurement portals - state
            departments, district offices, PSUs, hospitals, GeM - and surfaces every new tender the
            moment it's published. Type a question below and get real, live tenders back - not mock
            data. AI eligibility matching and document summaries are reserved for customers.
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--border-default)] px-6 py-14">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <div className="type-stat text-[var(--text-primary)]">{stats.totalActive.toLocaleString('en-IN')}</div>
            <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Tenders open right now</div>
          </div>
          <div>
            <div className="type-stat text-[var(--text-primary)]">{stats.activeSources}+</div>
            <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Government sources watched</div>
          </div>
          <div>
            <div className="type-stat text-[var(--text-primary)]">{stats.distinctDistricts}+</div>
            <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Districts covered</div>
          </div>
          <div>
            <div className="type-stat text-[var(--text-primary)]">{stats.distinctCategories}+</div>
            <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Tender categories</div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="type-subheading text-[var(--text-accent)]">Try it yourself</div>
          <h2 className="font-serif-display mt-2 text-[26px] text-[var(--text-primary)]">
            Up to 20 real, currently-open tenders per question
          </h2>
          <p className="mt-2 max-w-xl type-body text-[var(--text-secondary)]">
            Ask for a district, a category, or a minimum value - the same way our client digests work.
          </p>

          <div className="mt-8">
            <Suspense fallback={null}>
              <TenderPulseDemoExplorer />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-default)] px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-serif-display text-[28px] text-[var(--text-primary)] md:text-[34px]">
            Want every tender that matches your business?
          </h2>
          <p className="mx-auto mt-3 max-w-xl type-body text-[var(--text-secondary)]">
            Get a daily digest filtered to your districts, categories, and value range - with AI
            eligibility notes and document summaries, delivered straight to email.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-6 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(176,141,87,0.3)] transition-transform hover:-translate-y-px"
            >
              See plans
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/tools/bizharvest"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
            >
              Try the BizHarvest demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
