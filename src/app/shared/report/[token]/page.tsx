import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LevitateLockup } from '@/components/brand/LevitateLogo';
import ResearchReportView from '@/components/business/ResearchReportView';
import { toResearchReportRecord } from '@/lib/business-intelligence-server';
import { getServiceSupabase } from '@/lib/supabase';

type ModuleRow = {
  report_id: string;
  module_id: string;
  title: string;
  status: string;
  provider: string | null;
  generated_at: string | null;
  error: string | null;
  payload: unknown;
};

export const dynamic = 'force-dynamic';

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getServiceSupabase();
  const { data: report } = await supabase
    .from('business_research_reports')
    .select('id, status, target_name, target_type, target_url, notes, intelligence_score, report_summary, selected_modules, share_token, created_at, archived_at, business_profile')
    .eq('share_token', token)
    .maybeSingle();

  if (!report) {
    notFound();
  }

  const { data: modules } = await supabase
    .from('business_research_report_modules')
    .select('report_id, module_id, title, status, provider, generated_at, error, payload')
    .eq('report_id', report.id);

  const moduleResults = (modules ?? [])
    .reduce((acc, row) => {
      const moduleRow = row as ModuleRow;
      acc[moduleRow.module_id] = {
        id: moduleRow.module_id,
        title: moduleRow.title,
        status: moduleRow.status,
        provider: moduleRow.provider ?? undefined,
        generatedAt: moduleRow.generated_at ?? undefined,
        error: moduleRow.error ?? undefined,
        payload: moduleRow.payload && typeof moduleRow.payload === 'object' ? moduleRow.payload : undefined,
      };
      return acc;
    }, {} as Record<string, unknown>);

  const sharedReport = toResearchReportRecord({
    ...(report as Parameters<typeof toResearchReportRecord>[0]),
    module_results: moduleResults,
  });

  return (
    <main className="min-h-screen bg-[#efe6d7] px-4 py-6 text-[#23180f] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-[#d9c8b4] bg-[rgba(255,251,245,0.96)] p-6 shadow-[0_20px_60px_rgba(73,48,19,0.08)] md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <LevitateLockup
                markClassName="h-10 w-10 rounded-[14px]"
                wordmarkClassName="text-base text-[#2d2218]"
                suffix="OS"
                subtitle="Shared intelligence report"
                subtitleClassName="text-[#6d6155]"
              />
              <div className="mt-4 text-sm leading-7 text-[#6d6155]">
                Read-only external view. The report below reflects the saved LevitateOS output at the time it was shared.
              </div>
            </div>
            <div className="rounded-2xl border border-[#d8c3a2] bg-[#f8efde] px-4 py-3 text-sm text-[#8f6630]">
              Shared link
            </div>
          </div>
        </div>

        <ResearchReportView initialReport={sharedReport} readOnly />

        <section className="rounded-[28px] border border-[#d9c8b4] bg-[linear-gradient(135deg,#25190f_0%,#3b2a19_100%)] p-6 text-[#f3eadf] shadow-[0_18px_50px_rgba(33,21,10,0.22)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#d8b36b]">Want a report for your business?</div>
              <h2 className="mt-3 text-2xl font-semibold text-[#fff7ee]">Subscribe to LevitateOS and generate your own market research workspace.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#d7c6b2]">
                Visit LevitateLabs to subscribe, build your company workspace, and unlock research reports, legal tools, and business operating workflows.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/onboard"
                className="inline-flex items-center justify-center rounded-full bg-[#d4ae65] px-5 py-3 text-sm font-semibold text-[#1f140c] transition-transform hover:-translate-y-0.5"
              >
                Subscribe now
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-[#70563b] bg-[rgba(255,255,255,0.05)] px-5 py-3 text-sm font-medium text-[#f3eadf]"
              >
                Visit LevitateLabs
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
