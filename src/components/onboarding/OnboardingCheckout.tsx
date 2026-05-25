'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ExternalLink, Loader2, Lock, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';
import { BillingCycle, OnboardingContent, OnboardingPlan, getPlanPrice } from '@/lib/onboarding';

// Razorpay types are globally declared in src/types/declarations.d.ts

type AppliedCoupon = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
  originalAmount: number;
};

async function loadRazorpayCheckout() {
  if (typeof window === 'undefined') return false;
  if (window.Razorpay) return true;

  return await new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function isContactOnlyPlan(plan: OnboardingPlan, billingCycle: BillingCycle) {
  const price = getPlanPrice(plan, billingCycle);
  return (
    price <= 0 ||
    /enterprise|custom/i.test(plan.slug || '') ||
    /enterprise|custom|contact/i.test(plan.name || '') ||
    /contact/i.test(plan.cta_label || '')
  );
}

function inputClassName(invalid: boolean) {
  return `w-full rounded-[10px] border px-4 py-3 text-sm outline-none transition-[border-color,box-shadow,background-color,color] ${
    invalid
      ? 'border-[rgba(171,80,80,0.65)] bg-[rgba(72,27,27,0.24)] text-[var(--text-primary)] placeholder:text-[rgba(228,178,178,0.72)] focus:border-[rgba(191,94,94,0.75)] focus:shadow-[0_0_0_3px_rgba(171,80,80,0.18)]'
      : 'border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--gold-glow)]'
  }`;
}

export default function OnboardingCheckout({
  plans,
  content,
  isAuthenticated,
  accountEmail,
  loginHref,
  dashboardHref,
}: {
  plans: OnboardingPlan[];
  content: OnboardingContent;
  isAuthenticated: boolean;
  accountEmail?: string | null;
  loginHref: string;
  dashboardHref: string;
}) {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState(plans.find((plan) => plan.is_featured)?.id ?? plans[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [form, setForm] = useState({
    companyName: '',
    ownerName: '',
    phone: '',
  });

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0], [plans, selectedPlanId]);
  const selectedPlanIsContact = selectedPlan ? isContactOnlyPlan(selectedPlan, billingCycle) : false;
  const selectedPlanPrice = selectedPlan ? getPlanPrice(selectedPlan, billingCycle) : 0;
  const effectivePrice = appliedCoupon?.finalAmount ?? selectedPlanPrice;
  const companyInvalid = submitted && isAuthenticated && !selectedPlanIsContact && !form.companyName.trim();
  const ownerInvalid = submitted && isAuthenticated && !selectedPlanIsContact && !form.ownerName.trim();

  useEffect(() => {
    setAppliedCoupon(null);
  }, [billingCycle, selectedPlanId]);

  const handleApplyCoupon = async () => {
    if (!selectedPlan || !couponCode.trim()) {
      return;
    }

    try {
      setCouponLoading(true);
      setError('');
      const response = await fetch('/api/onboard/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode,
          planId: selectedPlan.id,
          billingCycle,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to apply coupon');
      }

      setAppliedCoupon(payload.data as AppliedCoupon);
    } catch (nextError) {
      setAppliedCoupon(null);
      setError(nextError instanceof Error ? nextError.message : 'Unable to apply coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);

    if (selectedPlanIsContact) {
      if (typeof window !== 'undefined') {
        window.location.assign('/#contact');
      } else {
        router.push('/#contact');
      }
      return;
    }

    if (!isAuthenticated) {
      router.push(loginHref);
      return;
    }

    if (!selectedPlan) return;

    if (!form.companyName.trim() || !form.ownerName.trim()) {
      setError('Complete the highlighted company details before continuing to checkout.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/onboard/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle,
          companyName: form.companyName,
          ownerName: form.ownerName,
          phone: form.phone,
          couponCode: appliedCoupon?.code ?? couponCode,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push(loginHref);
        return;
      }

      if (!data.success) {
        throw new Error(data.error || 'Checkout failed');
      }

      const checkoutReady = await loadRazorpayCheckout();
      if (!checkoutReady || !window.Razorpay) {
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
        throw new Error('Unable to load the payment form');
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Levitate Labs',
        description: `${selectedPlan.name} - ${billingCycle} billing`,
        prefill: {
          name: form.ownerName,
          email: data.accountEmail ?? accountEmail ?? undefined,
          contact: form.phone || undefined,
        },
        notes: {
          company_name: form.companyName,
          plan_slug: selectedPlan.slug,
          billing_cycle: billingCycle,
          coupon_code: appliedCoupon?.code ?? '',
        },
        theme: {
          color: '#C8A96E',
        },
        handler: async (responsePayload: RazorpaySubscriptionSuccessPayload) => {
          try {
            setLoading(true);
            const verifyResponse = await fetch('/api/onboard/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(responsePayload),
            });

            const verifyData = await verifyResponse.json();
            if (!verifyData.success) {
              throw new Error(verifyData.error || 'Unable to verify payment');
            }

            const nextHref = verifyData.dashboardUrl || data.dashboardUrl || dashboardHref;
            if (typeof window !== 'undefined') {
              window.location.assign(nextHref);
              return;
            }

            router.replace(nextHref);
          } catch (verifyError) {
            setError(verifyError instanceof Error ? verifyError.message : 'Payment verification failed');
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      razorpay?.on?.('payment.failed', (responsePayload: RazorpayPaymentFailedPayload) => {
        setError(responsePayload?.error?.description || 'Payment failed');
        setLoading(false);
      });

      razorpay.open();
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)]"
    >
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5 }}
          className={`${styles.panel} p-5`}
        >
          <div className="flex flex-wrap gap-3">
            {(['monthly', 'annual'] as BillingCycle[]).map((cycle) => (
              <motion.button
                key={cycle}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setBillingCycle(cycle)}
                className={`rounded-full px-4 py-2 type-label uppercase transition-colors ${
                  billingCycle === cycle
                    ? 'border border-[var(--border-strong)] bg-[var(--gold-glow)] text-[var(--gold-bright)]'
                    : 'border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cycle === 'monthly' ? 'Monthly billing' : 'Annual billing'}
              </motion.button>
            ))}
          </div>
          <p className="mt-4 type-body text-[var(--text-secondary)]">
            Pick the billing cycle first. Annual billing is the cleanest way to lock rollout scope and simplify renewal planning for the team.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan, index) => {
            const isSelected = plan.id === selectedPlanId;
            const isContactPlan = isContactOnlyPlan(plan, billingCycle);
            const price = getPlanPrice(plan, billingCycle);

            return (
              <motion.button
                key={plan.id}
                type="button"
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + index * 0.06, duration: 0.45 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`${styles.panel} ${styles.panelHover} text-left ${isSelected ? 'gradient-border-card' : ''}`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="type-heading text-[var(--text-primary)]">{plan.name}</div>
                      <div className="mt-2 type-body text-[var(--text-secondary)]">{plan.tagline}</div>
                    </div>
                    {plan.is_featured ? (
                      <span className="rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-2.5 py-1 type-label uppercase text-[var(--gold-bright)]">
                        Featured
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <div className="font-serif-display text-[40px] leading-none text-[var(--text-primary)]">
                      {isContactPlan ? 'Custom quote' : `Rs. ${price.toLocaleString('en-IN')}`}
                    </div>
                    <div className="mt-2 type-caption">
                      {isContactPlan ? 'Enterprise scope call' : billingCycle === 'monthly' ? 'Billed monthly' : 'Billed yearly'}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {(plan.highlights ?? []).slice(0, 3).map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--status-closed)] text-white">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="type-body text-[var(--text-secondary)]">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <span className={`type-label uppercase ${isSelected ? 'text-[var(--gold-bright)]' : 'text-[var(--text-tertiary)]'}`}>
                      {isSelected ? 'Selected plan' : 'Click to select'}
                    </span>
                    <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-[var(--gold-base)]' : 'bg-[var(--border-strong)]'}`} />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.55 }}
        className={`${styles.panel} relative overflow-hidden p-6 lg:p-8 xl:sticky xl:top-8`}
      >
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 grid place-items-center rounded-[14px] bg-[rgba(10,9,7,0.7)] backdrop-blur-md"
            >
              <div className="text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-[var(--gold-base)]" />
                <p className="mt-3 type-body text-[var(--text-secondary)]">Preparing your checkout...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="type-subheading text-[var(--text-tertiary)]">{content.eyebrow}</div>
        <h3 className="mt-3 type-hero text-[var(--text-primary)]">{selectedPlan?.name ?? 'Choose a plan'}</h3>
        <p className="mt-3 type-body text-[var(--text-secondary)]">{selectedPlan?.description}</p>

        {!isAuthenticated && !selectedPlanIsContact ? (
          <div className="mt-5 rounded-[14px] border border-[rgba(171,124,58,0.35)] bg-[rgba(171,124,58,0.14)] p-4">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold-bright)]" />
              <div>
                <div className="type-heading text-[var(--text-primary)]">Sign in required</div>
                <p className="mt-2 type-body text-[var(--text-secondary)]">
                  Purchases are locked to authenticated company users. Sign in first, then come back to continue.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(loginHref)}
              className="mt-4 inline-flex items-center gap-2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--gold-glow)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[rgba(201,165,90,0.2)]"
            >
              Go to login
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <div className={`mb-2 type-label uppercase ${companyInvalid ? 'text-[#f1a0a0]' : 'text-[var(--text-secondary)]'}`}>Company name</div>
            <input
              value={form.companyName}
              onChange={(event) => setForm((previous) => ({ ...previous, companyName: event.target.value }))}
              disabled={!isAuthenticated || loading}
              className={inputClassName(companyInvalid)}
              placeholder="Company name"
            />
            {companyInvalid ? <p className="mt-2 text-[11px] leading-5 text-[#f1a0a0]">This mandatory field has not been filled yet.</p> : null}
          </div>

          <div>
            <div className={`mb-2 type-label uppercase ${ownerInvalid ? 'text-[#f1a0a0]' : 'text-[var(--text-secondary)]'}`}>Owner name</div>
            <input
              value={form.ownerName}
              onChange={(event) => setForm((previous) => ({ ...previous, ownerName: event.target.value }))}
              disabled={!isAuthenticated || loading}
              className={inputClassName(ownerInvalid)}
              placeholder="Owner name"
            />
            {ownerInvalid ? <p className="mt-2 text-[11px] leading-5 text-[#f1a0a0]">This mandatory field has not been filled yet.</p> : null}
          </div>

          <div className="sm:col-span-2">
            <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Signed in account</div>
            <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 type-body text-[var(--text-primary)]">
              {accountEmail || 'Waiting for login'}
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">WhatsApp or phone</div>
            <input
              value={form.phone}
              onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
              disabled={!isAuthenticated || loading}
              className={inputClassName(false)}
              placeholder="Optional contact number"
            />
          </div>
        </div>

        {!selectedPlanIsContact ? (
          <div className="mt-6 rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-overlay)]/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <div className="mb-2 type-label uppercase text-[var(--text-secondary)]">Coupon code</div>
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  className={inputClassName(false)}
                  placeholder="Enter coupon code"
                  disabled={loading || couponLoading}
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || loading || couponLoading || !selectedPlan}
                className="inline-flex items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-overlay)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {couponLoading ? 'Checking...' : appliedCoupon ? 'Recheck coupon' : 'Apply coupon'}
              </button>
            </div>

            {appliedCoupon ? (
              <div className="mt-4 rounded-[12px] border border-[var(--border-strong)] bg-[var(--gold-glow)] px-4 py-3">
                <div className="type-label uppercase text-[var(--gold-bright)]">{appliedCoupon.code} applied</div>
                <div className="mt-2 type-body text-[var(--text-primary)]">
                  {appliedCoupon.name}
                  {appliedCoupon.description ? ` — ${appliedCoupon.description}` : ''}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 rounded-[14px] border border-[var(--border-default)] bg-[linear-gradient(135deg,rgba(201,165,90,0.08)_0%,rgba(201,165,90,0.02)_72%)] p-5">
          <div className="flex items-center justify-between gap-3 type-label uppercase text-[var(--text-tertiary)]">
            <span>Selected billing</span>
            <span>{billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</span>
          </div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="font-serif-display text-[40px] leading-none text-[var(--text-primary)]">
                {selectedPlanIsContact
                  ? 'Custom quote'
                  : `Rs. ${effectivePrice.toLocaleString('en-IN')}`}
              </div>
              <div className="mt-2 type-caption">{selectedPlan?.support_level}</div>
              {appliedCoupon ? (
                <div className="mt-3 space-y-1">
                  <div className="type-caption">Original: Rs. {selectedPlanPrice.toLocaleString('en-IN')}</div>
                  <div className="type-caption">Discount: Rs. {appliedCoupon.discountAmount.toLocaleString('en-IN')}</div>
                </div>
              ) : null}
            </div>
            <div className="max-w-[180px] type-body text-right text-[var(--text-secondary)]">
              Payment verifies first, then the workspace unlocks automatically.
            </div>
          </div>
        </div>

        {selectedPlan?.deliverables?.length ? (
          <div className="mt-6 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-overlay)]/60 p-5">
            <div className="type-subheading text-[var(--text-tertiary)]">Included deliverables</div>
            <div className="mt-4 space-y-3">
              {selectedPlan.deliverables.slice(0, 5).map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--status-closed)] text-white">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="type-body text-[var(--text-secondary)]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-[14px] border border-[var(--border-default)] bg-[var(--bg-overlay)] px-4 py-3 type-body text-[var(--text-secondary)]">
          <Sparkles className="mr-2 inline-block h-4 w-4 text-[var(--gold-base)]" />
          Secure handoff with instant verification, confirmation email, and dashboard redirect after checkout.
        </div>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-[14px] border border-[rgba(171,80,80,0.45)] bg-[rgba(171,80,80,0.16)] px-4 py-3 type-body text-[var(--text-primary)]"
          >
            {error}
          </motion.div>
        ) : null}

        <motion.button
          type="submit"
          disabled={loading || !selectedPlan || (!isAuthenticated && !selectedPlanIsContact)}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.99 }}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3.5 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {selectedPlanIsContact
            ? 'Contact us'
            : !isAuthenticated
              ? 'Sign in to continue'
              : (selectedPlan?.cta_label ?? 'Start onboarding')}
        </motion.button>
      </motion.form>
    </motion.div>
  );
}
