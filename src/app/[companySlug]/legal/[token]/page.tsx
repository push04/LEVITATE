import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LevitateLockup } from '@/components/brand/LevitateLogo'
import { resolveLegalNoticeIdFromShareToken } from '@/lib/business-share'
import type { LegalNoticeDraft } from '@/lib/business-intelligence'
import { getServiceSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SECTIONS: Array<{ key: keyof LegalNoticeDraft['sections']; label: string }> = [
  { key: 'header', label: 'Formal Header' },
  { key: 'facts', label: 'Facts and Chronology' },
  { key: 'legalGrounds', label: 'Legal Grounds' },
  { key: 'demand', label: 'Demand' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'consequences', label: 'Consequences' },
  { key: 'closing', label: 'Closing' },
]

export default async function SharedLegalNoticePage({
  params,
}: {
  params: Promise<{ companySlug: string; token: string }>
}) {
  const { token } = await params
  const noticeId = resolveLegalNoticeIdFromShareToken(token)

  if (!noticeId) {
    notFound()
  }

  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from('business_legal_notices')
    .select('title, notice_data, created_at')
    .eq('id', noticeId)
    .maybeSingle()

  const draft =
    data?.notice_data && typeof data.notice_data === 'object'
      ? (data.notice_data as LegalNoticeDraft)
      : null

  if (!data || !draft?.sections?.header) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#efe6d7] px-4 py-6 text-[#23180f] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[28px] border border-[#d9c8b4] bg-[rgba(255,251,245,0.96)] p-6 shadow-[0_20px_60px_rgba(73,48,19,0.08)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <LevitateLockup
                markClassName="h-10 w-10 rounded-[14px]"
                wordmarkClassName="text-base text-[#2d2218]"
                suffix="OS"
                subtitle="Shared legal notice draft"
                subtitleClassName="text-[#6d6155]"
              />
              <p className="max-w-3xl text-sm leading-7 text-[#6d6155]">
                This is a read-only shared draft generated inside LevitateOS legal tools and formatted for review.
              </p>
            </div>
            <div className="rounded-[18px] border border-[#dfcfba] bg-[#f8f2e8] px-4 py-3 text-sm font-medium text-[#715437]">
              Generated {new Date(data.created_at).toLocaleDateString('en-IN')}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#d9c8b4] bg-[#f5f0e8] p-6 shadow-[inset_0_2px_8px_rgba(0,0,0,0.08),0_24px_48px_rgba(0,0,0,0.12)] md:p-8">
          <div className="border-b border-black/10 pb-5 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-black/45">Legal document preview</div>
            <div className="mt-3 font-serif-display text-3xl tracking-[0.04em]">{draft.title}</div>
          </div>

          <div className="mt-6 space-y-5 text-[#1a1712]">
            {SECTIONS.map(section => (
              <article key={section.key} className="rounded-[16px] border border-black/8 bg-white/55 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/50">{section.label}</div>
                <div className="mt-3 whitespace-pre-wrap text-[15px] leading-8">
                  {draft.sections[section.key]}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#d9c8b4] bg-[linear-gradient(135deg,#25190f_0%,#3b2a19_100%)] p-6 text-[#f3eadf] shadow-[0_18px_50px_rgba(33,21,10,0.22)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#d8b36b]">Need this for your own business?</div>
              <h2 className="mt-3 text-2xl font-semibold text-[#fff7ee]">Use LevitateOS to draft notices, research markets, and run business operations.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#d7c6b2]">
                Subscribe to LevitateLabs to unlock your own business workspace, market reports, and legal drafting tools.
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
  )
}
