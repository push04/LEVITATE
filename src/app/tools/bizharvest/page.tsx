import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Database, MapPin, Phone, Tag } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase';
import { parseNotes, bizharvestSourceLabel } from '@/lib/bizharvest-analytics';
import { maskPhone } from '@/lib/demo-mask';
import BizHarvestDemoExplorer, { type DemoLead } from '@/components/tools/BizHarvestDemoExplorer';

export const dynamic = 'force-static';
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'BizHarvest Live Demo - Levitate Labs',
  description:
    'A live look at BizHarvest, our local-business lead scraper - real businesses pulled from Google Maps and JustDial, a small live sample shown here.',
};

const DEMO_LIMIT = 24;
// Bounded, not a full-table scan - a public page shouldn't run the same
// unbounded query the internal admin analytics page does (see
// getBizharvestAnalytics in src/lib/bizharvest-analytics.ts). This caps cost
// from anonymous traffic while still giving a real (if approximate) count.
const DISTINCT_SAMPLE_CAP = 4000;

async function getBizHarvestDemoData() {
  const supabase = getServiceSupabase();

  const [totalRes, phoneRes, websiteRes, cityRes, catRes, sampleRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).like('source', 'bizharvest_%'),
    supabase.from('leads').select('id', { count: 'exact', head: true }).like('source', 'bizharvest_%').not('phone', 'is', null),
    supabase.from('leads').select('id', { count: 'exact', head: true }).like('source', 'bizharvest_%').not('website_link', 'is', null),
    supabase.from('leads').select('city').like('source', 'bizharvest_%').not('city', 'is', null).limit(DISTINCT_SAMPLE_CAP),
    supabase.from('leads').select('service_category').like('source', 'bizharvest_%').not('service_category', 'is', null).limit(DISTINCT_SAMPLE_CAP),
    supabase
      .from('leads')
      .select('id, name, city, service_category, source, notes, created_at, phone, website_link')
      .like('source', 'bizharvest_%')
      .order('created_at', { ascending: false })
      .limit(DEMO_LIMIT),
  ]);

  const distinctCities = new Set((cityRes.data ?? []).map((r) => r.city)).size;
  const distinctCategories = new Set((catRes.data ?? []).map((r) => r.service_category)).size;

  const leads: DemoLead[] = (sampleRes.data ?? []).map((l) => {
    const meta = parseNotes(l.notes);
    return {
      id: l.id,
      name: l.name ?? 'Unknown business',
      city: l.city,
      category: l.service_category,
      source: bizharvestSourceLabel(l.source),
      rating: meta.rating ?? null,
      hasWebsite: Boolean(l.website_link),
      phoneMasked: maskPhone(l.phone),
      scrapedAt: l.created_at,
    };
  });

  return {
    leads,
    stats: {
      total: totalRes.count ?? 0,
      withPhone: phoneRes.count ?? 0,
      withWebsite: websiteRes.count ?? 0,
      distinctCities,
      distinctCategories,
    },
  };
}

export default async function BizHarvestDemoPage() {
  const { leads, stats } = await getBizHarvestDemoData();
  const phoneRate = stats.total > 0 ? Math.round((stats.withPhone / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--border-default)] px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="type-subheading text-[var(--text-accent)]">Live demo · BizHarvest</div>
          <h1 className="font-serif-display mt-4 text-[40px] leading-[1.05] tracking-tight text-[var(--text-primary)] md:text-[56px]">
            Real local businesses, scraped and scored automatically.
          </h1>
          <p className="mt-6 max-w-2xl type-body text-[17px] leading-8 text-[var(--text-secondary)]">
            BizHarvest continuously pulls real business listings from Google Maps and JustDial across
            Indian cities - name, category, rating, phone, website presence - so outreach never starts
            from a blank spreadsheet. Below is a live, small sample of what it has actually found, not
            mock data. Full contact details and the complete database are reserved for customers.
          </p>
        </div>
      </section>

      <section className="border-b border-[var(--border-default)] px-6 py-14">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <div className="type-stat text-[var(--text-primary)]">{stats.total.toLocaleString('en-IN')}</div>
            <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Businesses scraped</div>
          </div>
          <div>
            <div className="type-stat text-[var(--text-primary)]">{stats.distinctCities}+</div>
            <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Cities covered</div>
          </div>
          <div>
            <div className="type-stat text-[var(--text-primary)]">{stats.distinctCategories}+</div>
            <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Business categories</div>
          </div>
          <div>
            <div className="type-stat text-[var(--text-primary)]">{phoneRate}%</div>
            <div className="mt-1 type-subheading text-[var(--text-tertiary)]">Have a phone number on file</div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="type-subheading text-[var(--text-accent)]">Sample leads</div>
          <h2 className="font-serif-display mt-2 text-[26px] text-[var(--text-primary)]">
            {leads.length} of {stats.total.toLocaleString('en-IN')} real scraped businesses
          </h2>
          <p className="mt-2 max-w-xl type-body text-[var(--text-secondary)]">
            Filter and search this live sample the same way our admin dashboard does. Phone numbers are
            partially masked here - customers see the full number, instantly.
          </p>

          <div className="mt-8">
            <BizHarvestDemoExplorer leads={leads} />
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-default)] px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-serif-display text-[28px] text-[var(--text-primary)] md:text-[34px]">
            Want the full {stats.total.toLocaleString('en-IN')}-business database?
          </h2>
          <p className="mx-auto mt-3 max-w-xl type-body text-[var(--text-secondary)]">
            Growth OS and Scale Suite customers get unmasked contact details, unlimited search, city/category
            targeting, and one-click WhatsApp outreach - all self-updating, every day.
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
              href="/tools/tenderpulse"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
            >
              Try the TenderPulse demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
