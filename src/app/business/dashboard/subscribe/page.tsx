import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';
import { createClient as createSupabaseServerClient } from '@/lib/supabase-server';
import { getServiceSupabase } from '@/lib/supabase';
import { getBusinessPortalState } from '@/lib/business-portal';
import { DEFAULT_ONBOARDING_CONTENT, parseContent } from '@/lib/onboarding';
import OnboardingCheckout from '@/components/onboarding/OnboardingCheckout';

export const dynamic = 'force-dynamic';

export default async function BusinessSubscribePage() {
  const authSupabase = await createSupabaseServerClient();
  const serviceSupabase = getServiceSupabase();
  const { portal } = await getBusinessPortalState();

  const [{ data: sessionData }, plansRes, settingsRes] = await Promise.all([
    authSupabase.auth.getSession(),
    serviceSupabase.from('onboarding_plans').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    serviceSupabase.from('settings').select('value').eq('key', 'onboarding_page_content').maybeSingle(),
  ]);

  const session = sessionData.session;
  const accountEmail = session?.user.email ?? null;
  const plans = plansRes.data ?? [];
  const content = parseContent(settingsRes.data?.value ?? DEFAULT_ONBOARDING_CONTENT);

  if (portal.hasPaidAccess) {
    return (
      <div className="space-y-6">
        <div className={`${styles.panel} overflow-hidden p-6 md:p-8`}>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(61,122,92,0.35)] bg-[rgba(61,122,92,0.15)] px-3 py-1 type-label uppercase text-[var(--text-primary)]">
            <CheckCircle2 className="h-4 w-4 text-[var(--status-closed)]" />
            Subscription active
          </div>
          <h1 className="mt-5 type-hero text-[var(--text-primary)]">Business workspace is already active</h1>
          <p className="mt-3 max-w-3xl type-body text-[var(--text-secondary)]">
            {portal.planName ? `${portal.planName} is already active for this workspace.` : 'Your subscription is already active.'} Jump back into CRM, leads, reports, and legal tools from the main dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/business/dashboard"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:-translate-y-px"
            >
              Open dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className={`${styles.panel} p-6 md:p-8`}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
          <div>
            <div className="type-subheading text-[var(--text-tertiary)]">Subscription activation</div>
            <h1 className="mt-3 type-hero text-[var(--text-primary)]">Activate full Business dashboard access</h1>
            <p className="mt-4 max-w-4xl type-body text-[var(--text-secondary)]">
              Payment happens only here, after authenticated login or registration. Once the subscription verifies, your business workspace opens CRM, leads, automation, report history, and all plan-level tools immediately.
            </p>
          </div>

          <div className={`${styles.panel} bg-[linear-gradient(135deg,rgba(201,165,90,0.08)_0%,rgba(201,165,90,0.02)_72%)] p-5`}>
            <div className="type-subheading text-[var(--text-tertiary)]">Checkout notes</div>
            <div className="mt-4 space-y-3">
              {[
                'Authenticated checkout only',
                'Plan activates automatically after payment',
                'Redirect lands inside the business dashboard',
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--gold-base)]" />
                  <p className="type-body text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <OnboardingCheckout
        plans={plans}
        content={content}
        isAuthenticated={Boolean(session)}
        accountEmail={accountEmail}
        loginHref="/business/login?next=/business/dashboard/subscribe"
        dashboardHref="/business/dashboard?onboard=success"
      />
    </div>
  );
}
