import Link from 'next/link'
import { getServiceSupabase } from '@/lib/supabase'
import { getWorkspaceUrl } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'

export default async function CompanyWorkspacePage({
  params
}: {
  params: Promise<{ companySlug: string }>
}) {
  const { companySlug } = await params
  const supabase = getServiceSupabase()

  // Search by slug fields first, then fall back to company_name slug match
  let { data: subscription } = await supabase
    .from('onboarding_subscriptions')
    .select('*')
    .or(`workspace_slug.eq.${companySlug},subdomain_slug.eq.${companySlug}`)
    .maybeSingle()

  // Fallback: try matching against company_name (slugified)
  if (!subscription) {
    const { data: all } = await supabase
      .from('onboarding_subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    subscription = (all ?? []).find(s => {
      const slug = (s.company_name ?? '')
        .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return slug === companySlug
    }) ?? null
  }

  // Soft 404 — show a friendly "not set up yet" screen instead of hard 404
  if (!subscription) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0c0c0b] px-4 text-[#f5f1ea]">
        <div className="text-center">
          <div className="text-4xl mb-6">🏢</div>
          <h1 className="text-2xl font-semibold mb-3">Workspace not found</h1>
          <p className="text-white/60 mb-8 max-w-md">
            This workspace URL hasn&apos;t been set up yet, or may have moved.
            If you&apos;re a LEVITATE customer, log in to access your dashboard.
          </p>
          <Link href="/business/login" className="inline-flex items-center justify-center rounded-full bg-[#d9c59b] px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[#e5d0a8]">
            Business login →
          </Link>
        </div>
      </main>
    )
  }

  const { data: plan } = await supabase
    .from('onboarding_plans')
    .select('*')
    .eq('id', subscription.plan_id)
    .maybeSingle()

  const status = subscription.status ?? 'pending'
  const planName = plan?.name ?? 'Onboarding Plan'
  const workspaceUrl =
    subscription.workspace_backlink_url ??
    subscription.subdomain_url ??
    getWorkspaceUrl(subscription.workspace_slug ?? companySlug)

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(196,164,102,0.18),_transparent_24%),linear-gradient(180deg,_#0c0c0b_0%,_#151515_100%)] px-4 py-10 text-[#f5f1ea] sm:px-6 lg:px-8 lg:py-16">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8 lg:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[#d9c59b]">Client workspace</div>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                {subscription.company_name}
              </h1>
              <p className="text-base leading-7 text-white/70 sm:text-lg">
                This is the live branded workspace route for your onboarding shell. Use it to review rollout status, branded pages, and the client-facing workspace we provision for the account.
              </p>
            </div>

            <div className="w-full max-w-xl rounded-[24px] border border-white/10 bg-black/20 p-5 lg:max-w-sm">
              <div className="text-xs uppercase tracking-[0.22em] text-[#d9c59b]">Business backlink</div>
              <div className="mt-2 break-all text-lg font-semibold leading-7">{workspaceUrl}</div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-3 py-1 uppercase tracking-[0.18em] text-white/75">{status}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 uppercase tracking-[0.18em] text-white/75">{subscription.billing_cycle}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 uppercase tracking-[0.18em] text-white/75">{planName}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { label: 'Owner', value: subscription.owner_name },
              { label: 'Email', value: subscription.email },
              { label: 'Phone', value: subscription.phone || 'Not added yet' }
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">{item.label}</div>
                <div className="mt-2 break-words text-sm leading-6 text-white/80">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[#d9c59b]">Included systems</div>
              <div className="mt-4 space-y-2">
                {[
                  'CRM and pipeline structure',
                  'Lead capture and routing',
                  'Email automation setup',
                  'WhatsApp automation setup',
                  'Branded workspace route'
                ].map(item => (
                  <div key={item} className="flex items-start gap-2 text-sm text-white/82">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9c59b]" />
                    <span className="leading-6 break-words">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-[#d9c59b]">Plan details</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/45">Amount</div>
                  <div className="mt-2 text-xl font-semibold">Rs. {Number(subscription.amount).toLocaleString('en-IN')}</div>
                </div>
                <div className="rounded-2xl bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/45">Billing</div>
                  <div className="mt-2 text-xl font-semibold capitalize">{subscription.billing_cycle}</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-black/20 p-4 text-sm leading-7 text-white/72">
                {plan?.description ?? 'Your workspace will be customized once the onboarding flow is completed.'}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/business/dashboard"
                  className="inline-flex items-center justify-center rounded-full bg-[#d9c59b] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e5d0a8]"
                >
                  Open dashboard
                </Link>
                <Link
                  href="/business/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
                >
                  Business login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
