'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BadgeIndianRupee,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  Files,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  Mail,
  MapPinned,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
  WalletCards,
  X,
} from 'lucide-react';
import Link from 'next/link';
import styles from '@/components/business/ui/DashboardPrimitives.module.css';
import { GoldButton } from '@/components/business/ui';
import {
  DELAYED_PAYMENT_OPTIONS,
  PORTAL_FEATURES,
  RESEARCH_DAILY_LIMIT,
  RESEARCH_MODULES,
} from '@/lib/business-intelligence';
import type { OnboardingContent, OnboardingPlan } from '@/lib/onboarding';

function contactOnly(plan: OnboardingPlan) {
  return (
    Number(plan.monthly_price) <= 0 ||
    Number(plan.annual_price) <= 0 ||
    /enterprise|custom/i.test(plan.slug || '') ||
    /enterprise|custom|contact/i.test(plan.name || '')
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className={`${styles.panel} premium-noise-panel p-5`}>
      <div className="type-subheading text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-3 type-stat text-[var(--text-primary)]">{value}</div>
      <p className="mt-2 type-body text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function DetailCard({
  title,
  body,
  icon,
  tone = 'gold',
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
  tone?: 'gold' | 'blue' | 'green' | 'rust';
}) {
  const toneClassName =
    tone === 'blue'
      ? 'border-[rgba(107,127,163,0.22)] bg-[rgba(107,127,163,0.08)] text-[var(--status-new)]'
      : tone === 'green'
        ? 'border-[rgba(61,122,92,0.24)] bg-[rgba(61,122,92,0.08)] text-[var(--status-closed)]'
        : tone === 'rust'
          ? 'border-[rgba(184,124,58,0.24)] bg-[rgba(184,124,58,0.08)] text-[var(--status-progress)]'
          : 'border-[var(--border-default)] bg-[var(--gold-glow)] text-[var(--gold-bright)]';

  return (
    <div className={`${styles.panel} ${styles.panelHover} h-full p-5`}>
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-full border ${toneClassName}`}>
        {icon}
      </div>
      <div className="mt-4 type-heading text-[var(--text-primary)]">{title}</div>
      <p className="mt-3 type-body text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

function ColumnSection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: Array<{ title: string; body: string }>;
}) {
  return (
    <div className={`${styles.panel} p-5`}>
      <div className="type-subheading text-[var(--text-tertiary)]">{title}</div>
      {subtitle ? <p className="mt-3 type-body text-[var(--text-secondary)]">{subtitle}</p> : null}
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.title} className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(201,165,90,0.04)] p-4">
            <div className="type-heading text-[var(--text-primary)]">{item.title}</div>
            <p className="mt-2 type-body text-[var(--text-secondary)]">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPitchDeck({
  plans,
  content,
  accountEmail,
  subscribeHref,
  loginHref,
}: {
  plans: OnboardingPlan[];
  content: OnboardingContent;
  accountEmail: string | null;
  subscribeHref: string;
  loginHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const standardPlans = useMemo(() => plans.filter((plan) => !contactOnly(plan)), [plans]);
  const enterprisePlan = useMemo(() => plans.find((plan) => contactOnly(plan)) ?? null, [plans]);
  const primaryCtaHref = accountEmail ? subscribeHref : loginHref;
  const primaryCtaLabel = accountEmail ? 'Open Subscribe Flow' : 'Continue to Subscribe';
  const openDeck = () => {
    setActiveIndex(0);
    setOpen(true);
  };
  const closeDeck = () => setOpen(false);

  const coreWorkspaceCards = [
    {
      title: 'Overview',
      body: 'A business command surface with plan status, backlink identity, rollup stats, and quick entry into the operating stack.',
      icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />,
      tone: 'gold' as const,
    },
    {
      title: 'Private CRM',
      body: 'A business-owned CRM pipeline where copied leads become editable records with custom stages, prices, notes, and commercial context.',
      icon: <Building2 className="h-5 w-5" strokeWidth={1.5} />,
      tone: 'blue' as const,
    },
    {
      title: 'Leads Desk',
      body: 'Operational lead feed with search, status badges, contact copy actions, and one-click transfer into the business CRM.',
      icon: <ClipboardList className="h-5 w-5" strokeWidth={1.5} />,
      tone: 'green' as const,
    },
    {
      title: 'Automation Hub',
      body: 'Live automation visibility for active agents, tasks, messaging activity, and performance tracking tied to the subscribed business.',
      icon: <Bot className="h-5 w-5" strokeWidth={1.5} />,
      tone: 'rust' as const,
    },
    {
      title: 'Mailbox',
      body: 'A shared business inbox surface for conversation history, client-facing thread visibility, and communication continuity.',
      icon: <Mail className="h-5 w-5" strokeWidth={1.5} />,
      tone: 'gold' as const,
    },
    {
      title: 'Profile Settings',
      body: 'Persistent business context storage so future AI outputs are framed around the company, not as generic market commentary.',
      icon: <UserRoundCog className="h-5 w-5" strokeWidth={1.5} />,
      tone: 'blue' as const,
    },
    {
      title: 'Report History',
      body: 'Saved report library with score tracking, reopen flows, exports, and shareable read-only backlinks for delivery outside the workspace.',
      icon: <Files className="h-5 w-5" strokeWidth={1.5} />,
      tone: 'green' as const,
    },
    {
      title: 'Business Backlink',
      body: 'Each business gets a clean path-based route on levitatelabs.online/company-name instead of a brittle subdomain setup.',
      icon: <Link2 className="h-5 w-5" strokeWidth={1.5} />,
      tone: 'rust' as const,
    },
  ];

  const researchGroups = [
    {
      title: 'Business and competitive clarity',
      items: RESEARCH_MODULES.filter((module) =>
        ['business_profile', 'competitor_intelligence', 'customer_personas', 'go_to_market'].includes(module.id)
      ).map((module) => ({
        title: module.title,
        body: module.description,
      })),
    },
    {
      title: 'Market and growth sizing',
      items: RESEARCH_MODULES.filter((module) =>
        ['market_sizing', 'future_growth', 'pricing_intelligence', 'funding_landscape'].includes(module.id)
      ).map((module) => ({
        title: module.title,
        body: module.description,
      })),
    },
    {
      title: 'Strategic and risk diagnostics',
      items: RESEARCH_MODULES.filter((module) =>
        ['swot_analysis', 'pestle_analysis', 'technology_landscape', 'risk_matrix'].includes(module.id)
      ).map((module) => ({
        title: module.title,
        body: module.description,
      })),
    },
    {
      title: 'Benchmarks and regulation',
      items: RESEARCH_MODULES.filter((module) =>
        ['industry_benchmarking', 'regulatory_landscape'].includes(module.id)
      ).map((module) => ({
        title: module.title,
        body: module.description,
      })),
    },
  ];

  const legalRoutes = DELAYED_PAYMENT_OPTIONS.map((option) => ({
    title: option.title.replace(/^Option \d+ - /, ''),
    body: `${option.recommendedFor}. ${option.timeline}.`,
  }));

  const slides = [
    {
      id: 'overview',
      nav: 'What is LevitateOS',
      eyebrow: 'Pitch Deck',
      title: 'A business operating system built for Indian SMB execution',
      description:
        'LevitateOS is not just a subscribe screen. It is a branded operating layer that combines CRM, lead operations, automation visibility, AI market intelligence, legal recovery tooling, shareable reports, and business-specific delivery infrastructure.',
      content: (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Core Surfaces" value={`${PORTAL_FEATURES.length}`} detail="Business modules inside the workspace, from CRM to legal operations." />
            <MetricCard label="Research Engines" value={`${RESEARCH_MODULES.length}`} detail="Selectable intelligence modules that can run together in one report." />
            <MetricCard label="Daily Report Quota" value={`${RESEARCH_DAILY_LIMIT}`} detail="Backend-enforced full report generations per calendar day, per account." />
            <MetricCard label="Legal Recovery Paths" value={`${DELAYED_PAYMENT_OPTIONS.length}`} detail="Structured delayed-payment options available inside the legal workspace." />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DetailCard
              title="One workspace, not five disconnected tools"
              body="Instead of forcing the client across separate CRM, automation, research, reporting, and legal apps, LevitateOS keeps business operations and decision support inside one branded system."
              icon={<BriefcaseBusiness className="h-5 w-5" strokeWidth={1.5} />}
            />
            <DetailCard
              title="Backlink-first delivery"
              body="Business identity is delivered as a clean route on levitatelabs.online/company-name, which is more stable, easier to share, and aligned with the current onboarding model."
              icon={<MapPinned className="h-5 w-5" strokeWidth={1.5} />}
              tone="blue"
            />
            <DetailCard
              title="Operations plus intelligence plus legal"
              body="The client is not just buying visibility. They get workflow tooling, AI-assisted market work, exportable documents, and external share links that can be used in sales and advisory situations."
              icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.5} />}
              tone="green"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'onboarding-system',
      nav: 'How onboarding works',
      eyebrow: 'Client Journey',
      title: 'The onboarding system is transparent before payment and controlled after activation',
      description:
        'The current onboarding journey shows pricing up front, keeps payment behind authentication, supports coupons in checkout, and unlocks the business workspace after verification. That makes the flow safer for the client and cleaner operationally for the team.',
      content: (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <ColumnSection
            title="Before checkout"
            subtitle="What the client can evaluate before committing."
            items={[
              {
                title: 'Visible pricing and plan scope',
                body: 'The public onboarding page shows plans, featured scope, FAQs, and context before asking the client to authenticate.',
              },
              {
                title: 'Secure payment path',
                body: 'Payment only happens after login or registration inside the subscribe flow, keeping billing tied to a real business account.',
              },
              {
                title: 'Coupon-ready checkout',
                body: 'Businesses can enter promotional codes during subscribe, see adjusted pricing, and continue into the payment flow with the discount applied.',
              },
              {
                title: 'Branded route preview',
                body: 'The onboarding content already primes the client for a clean path-based backlink instead of a subdomain dependency.',
              },
            ]}
          />

          <div className="grid gap-5">
            <div className={`${styles.panel} premium-noise-panel p-5`}>
              <div className="type-subheading text-[var(--text-tertiary)]">After activation</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  ['Workspace unlock', 'The business workspace opens with plan-aware access controls and branded identity.'],
                  ['Saved context', 'Business profile settings persist so research and legal flows can use reusable company context.'],
                  ['Shareable delivery', 'Reports and legal drafts can be exported and shared through read-only backlink flows.'],
                  ['Admin governance', 'Plan-level controls and coupon tooling shape what each business receives.'],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(201,165,90,0.04)] p-4">
                    <div className="type-heading text-[var(--text-primary)]">{title}</div>
                    <p className="mt-2 type-body text-[var(--text-secondary)]">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${styles.panel} p-5`}>
              <div className="type-subheading text-[var(--text-tertiary)]">Service promise already visible in onboarding</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {content.trustItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold-base)]" strokeWidth={1.8} />
                    <div className="type-body text-[var(--text-secondary)]">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'workspace-stack',
      nav: 'Business workspace',
      eyebrow: 'Workspace Inventory',
      title: 'What the business gets inside the operating system',
      description:
        'The business workspace is not a generic dashboard skin. It is a structured operating stack that handles records, communication visibility, reporting history, and business identity in one place.',
      content: (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {coreWorkspaceCards.map((card) => (
            <DetailCard key={card.title} title={card.title} body={card.body} icon={card.icon} tone={card.tone} />
          ))}
        </div>
      ),
    },
    {
      id: 'research-stack',
      nav: 'Research engine',
      eyebrow: 'Market Intelligence',
      title: 'Businesses can generate multi-module AI market reports from one intake',
      description:
        'The research workspace stores optional business context, lets the client select multiple modules at once, enforces a daily quota on the backend, and then renders exported, shareable intelligence outputs around the chosen target.',
      content: (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <DetailCard
              title="Context-aware"
              body="The client can save their own business profile once, then use it to frame future reports relative to their company rather than as generic advice."
              icon={<UserRoundCog className="h-5 w-5" strokeWidth={1.5} />}
            />
            <DetailCard
              title="Module-selective"
              body="Reports are no longer one-size-fits-all. Businesses can choose multiple modules depending on whether they need sizing, risk, competition, pricing, or GTM depth."
              icon={<FileSearch className="h-5 w-5" strokeWidth={1.5} />}
              tone="blue"
            />
            <DetailCard
              title="Deliverable-ready"
              body="Generated reports are saved, exported, and shareable through backlink routes so they can be reviewed outside the main dashboard."
              icon={<Files className="h-5 w-5" strokeWidth={1.5} />}
              tone="green"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {researchGroups.map((group) => (
              <ColumnSection key={group.title} title={group.title} items={group.items} />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'legal-stack',
      nav: 'Legal tools',
      eyebrow: 'Recovery and Notice Tools',
      title: 'Legal support is built for Indian business recovery workflows',
      description:
        'The legal workspace combines an AI-assisted legal notice drafting flow with a static delayed-payment advisory system so the business can both generate action documents and understand the escalation routes available under Indian law.',
      content: (
        <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-5">
            <ColumnSection
              title="Legal notice drafter"
              subtitle="What the drafting tool currently does for the business."
              items={[
                {
                  title: 'Structured legal intake',
                  body: 'Collects sender, recipient, transaction, breach, objective, and payment-default details before drafting.',
                },
                {
                  title: 'AI-assisted notice generation',
                  body: 'Uses the legal input data to create a professional first draft rather than exposing the client to a blank document workflow.',
                },
                {
                  title: 'Editable preview and downloads',
                  body: 'The draft can be reviewed on screen and exported through copy, DOCX, and PDF delivery paths.',
                },
                {
                  title: 'Shareable legal backlinks',
                  body: 'Generated legal drafts can be shared outside the workspace through read-only routes when the client needs to circulate the output.',
                },
              ]}
            />

            <div className={`${styles.panel} p-5`}>
              <div className="type-subheading text-[var(--text-tertiary)]">Why this matters</div>
              <div className="mt-4 space-y-3">
                {[
                  'Most SMBs do not need a full law-firm workflow on day one. They need a guided starting point that turns a payment dispute into a formal, exportable first action.',
                  'The delayed-payment advisor gives context on escalation paths like MSME council, cheque dishonour, commercial court, arbitration, and IBC without making the business guess.',
                ].map((item) => (
                  <div key={item} className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(201,165,90,0.04)] p-4 type-body text-[var(--text-secondary)]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ColumnSection
            title="Delayed payment advisory"
            subtitle="The informational legal routes already represented inside the product."
            items={legalRoutes}
          />
        </div>
      ),
    },
    {
      id: 'difference',
      nav: 'Why we are different',
      eyebrow: 'Positioning',
      title: 'What makes LevitateOS different from a generic dark SaaS or agency portal',
      description:
        'The differentiator is not just design polish. It is the product shape: a brandable operating layer for Indian businesses that blends execution, intelligence, legal guidance, and client-facing delivery in one environment.',
      content: (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DetailCard
            title="Private copied CRM"
            body="Leads can be copied into a separate CRM so the client can edit pricing, notes, and stages without corrupting the original source record."
            icon={<ClipboardList className="h-5 w-5" strokeWidth={1.5} />}
          />
          <DetailCard
            title="Plan-aware feature access"
            body="Feature availability is governed by plan controls, so the workspace can scale from a lean rollout to a fuller operating stack without redesigning the product."
            icon={<LockKeyhole className="h-5 w-5" strokeWidth={1.5} />}
            tone="blue"
          />
          <DetailCard
            title="Shareable outputs"
            body="Reports and legal documents are built to be exported and shared externally, which turns the workspace into a deliverables engine instead of just an internal admin area."
            icon={<Files className="h-5 w-5" strokeWidth={1.5} />}
            tone="green"
          />
          <DetailCard
            title="Backlink-first identity"
            body="The workspace is delivered as a branded path on the main domain, which is easier to support, easier to explain, and aligned with how the onboarding promise is currently written."
            icon={<Link2 className="h-5 w-5" strokeWidth={1.5} />}
            tone="rust"
          />
          <DetailCard
            title="Business intelligence included"
            body="The product does not stop at ops dashboards. It offers research tooling with competitor, market, growth, risk, pricing, GTM, benchmark, and compliance depth."
            icon={<Sparkles className="h-5 w-5" strokeWidth={1.5} />}
          />
          <DetailCard
            title="Designed for Indian operators"
            body="The product language, legal guidance, pricing framing, onboarding flow, and business route logic are all aimed at Indian SMB operators rather than a generic global SaaS template."
            icon={<BadgeIndianRupee className="h-5 w-5" strokeWidth={1.5} />}
            tone="green"
          />
        </div>
      ),
    },
    {
      id: 'plans',
      nav: 'Plans and scope',
      eyebrow: 'Commercial Scope',
      title: 'How the current offering is packaged commercially',
      description:
        'The client can compare standard plans on the onboarding page before authentication, then enter the secure subscribe flow to complete billing and activate the workspace.',
      content: (
        <div className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-3">
            {standardPlans.map((plan) => (
              <div
                key={plan.id}
                className={`${styles.panel} ${plan.is_featured ? 'gradient-border-card shadow-[var(--shadow-gold)]' : ''} p-5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="type-heading text-[var(--text-primary)]">{plan.name}</div>
                    <p className="mt-2 type-body text-[var(--text-secondary)]">
                      {plan.tagline || plan.description || 'Business operating system rollout.'}
                    </p>
                  </div>
                  {plan.is_featured ? (
                    <div className="rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-3 py-1 type-label uppercase text-[var(--gold-bright)]">
                      Featured
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap items-end gap-2">
                  <div className="font-serif-display text-[40px] leading-none text-[var(--text-primary)]">
                    Rs. {Number(plan.monthly_price).toLocaleString('en-IN')}
                  </div>
                  <div className="pb-1 text-[18px] text-[var(--text-secondary)]">/ month</div>
                </div>
                <div className="mt-2 type-caption">Annual: Rs. {Number(plan.annual_price).toLocaleString('en-IN')}</div>

                <div className="mt-5 space-y-3">
                  {(plan.highlights ?? []).slice(0, 4).map((highlight) => (
                    <div key={highlight} className="flex items-start gap-3">
                      <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--status-closed)] text-[var(--text-primary)]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <div className="type-body text-[var(--text-secondary)]">{highlight}</div>
                    </div>
                  ))}
                </div>

                {plan.deliverables?.length ? (
                  <div className="mt-5 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(201,165,90,0.04)] p-4">
                    <div className="type-subheading text-[var(--text-tertiary)]">Deliverables</div>
                    <div className="mt-3 space-y-2">
                      {plan.deliverables.slice(0, 3).map((deliverable) => (
                        <div key={deliverable} className="type-body text-[var(--text-secondary)]">
                          {deliverable}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {enterprisePlan ? (
            <div className={`${styles.panel} p-5`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="type-heading text-[var(--text-primary)]">{enterprisePlan.name}</div>
                  <p className="mt-2 type-body text-[var(--text-secondary)]">
                    {enterprisePlan.description || enterprisePlan.tagline || 'Custom commercial scope for larger implementation needs.'}
                  </p>
                </div>
                <Link
                  href="/#contact"
                  className="inline-flex items-center justify-center rounded-[10px] border border-[var(--border-default)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-overlay)]"
                >
                  Contact for enterprise rollout
                </Link>
              </div>
            </div>
          ) : null}

          <div className={`${styles.panel} premium-noise-panel p-5`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="type-subheading text-[var(--gold-base)]">Next step</div>
                <div className="mt-2 type-title text-[var(--text-primary)]">Ready to open the subscribe flow?</div>
                <p className="mt-2 type-body text-[var(--text-secondary)]">
                  {accountEmail
                    ? `Signed in as ${accountEmail}. You can move directly into secure checkout now.`
                    : 'Create or open a business account first, then complete billing inside the protected subscribe flow.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <GoldButton variant="secondary" iconLeft={<WalletCards className="h-4 w-4" />} onClick={closeDeck}>
                  Return to pricing
                </GoldButton>
                <Link
                  href={primaryCtaHref}
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] transition-[transform,filter] duration-200 hover:-translate-y-px hover:brightness-105"
                >
                  <span>{primaryCtaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDeck();
        return;
      }

      if (event.key === 'ArrowRight') {
        setActiveIndex((current) => Math.min(current + 1, slides.length - 1));
      }

      if (event.key === 'ArrowLeft') {
        setActiveIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, slides.length]);

  const activeSlide = slides[activeIndex];

  return (
    <>
      <div className={`${styles.panel} premium-noise-panel p-5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="type-subheading text-[var(--gold-base)]">What are we?</div>
            <div className="mt-2 type-title text-[var(--text-primary)]">Open the LevitateOS pitch deck</div>
            <p className="mt-2 max-w-3xl type-body text-[var(--text-secondary)]">
              A deep walkthrough of what the client actually gets: onboarding logic, workspace modules, research engines, legal tools, shareable deliverables, and commercial scope.
            </p>
          </div>

          <GoldButton iconLeft={<Sparkles className="h-4 w-4" />} iconRight={<ArrowRight className="h-4 w-4" />} onClick={openDeck}>
            Open interactive deck
          </GoldButton>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-[rgba(7,6,4,0.8)] px-3 py-3 backdrop-blur-md sm:px-5 sm:py-5"
            onClick={closeDeck}
          >
            <motion.section
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.985 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto flex h-full max-h-[calc(100vh-24px)] w-full max-w-[1320px] flex-col overflow-hidden rounded-[28px] border border-[var(--border-default)] bg-[rgba(15,14,11,0.98)] shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="onboarding-pitch-deck-title"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-4 sm:px-6">
                <div>
                  <div className="type-subheading text-[var(--gold-base)]">LevitateOS Deck</div>
                  <div id="onboarding-pitch-deck-title" className="mt-1 type-heading text-[var(--text-primary)]">
                    {activeSlide.title}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 type-mono text-[var(--text-secondary)]">
                    {String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    onClick={closeDeck}
                    aria-label="Close LevitateOS deck"
                  >
                    <X className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[270px_minmax(0,1fr)]">
                <aside className="border-b border-[var(--border-subtle)] bg-[rgba(201,165,90,0.03)] p-4 xl:border-b-0 xl:border-r xl:p-5">
                  <div className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
                    {slides.map((slide, index) => {
                      const isActive = index === activeIndex;

                      return (
                        <button
                          key={slide.id}
                          type="button"
                          className={`min-w-[210px] rounded-[14px] border px-4 py-3 text-left transition-[border-color,background-color,color,transform] duration-200 xl:min-w-0 ${
                            isActive
                              ? 'border-[var(--border-strong)] bg-[linear-gradient(135deg,rgba(201,165,90,0.14),rgba(201,165,90,0.06))] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(201,165,90,0.1)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
                          }`}
                          onClick={() => setActiveIndex(index)}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                                isActive
                                  ? 'border-[var(--gold-base)] bg-[var(--gold-glow)] text-[var(--gold-bright)]'
                                  : 'border-[var(--border-default)] text-[var(--text-tertiary)]'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div>
                              <div className="type-heading">{slide.nav}</div>
                              <div className="mt-1 type-caption">{slide.eyebrow}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <div className="min-h-0 overflow-y-auto bg-[linear-gradient(180deg,rgba(29,27,22,0.75)_0%,rgba(15,14,11,0.94)_18%,rgba(15,14,11,1)_100%)]">
                  <div className="mx-auto max-w-[980px] px-4 py-5 sm:px-6 sm:py-6">
                    <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[rgba(201,165,90,0.09)]">
                      <motion.div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--gold-base),var(--gold-bright))]"
                        animate={{ width: `${((activeIndex + 1) / slides.length) * 100}%` }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeSlide.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-6"
                      >
                        <div className="rounded-[24px] border border-[var(--border-default)] bg-[linear-gradient(135deg,rgba(201,165,90,0.1)_0%,rgba(201,165,90,0.03)_56%,rgba(22,20,16,0.92)_100%)] p-6 shadow-[var(--shadow-md)]">
                          <div className="inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--gold-glow)] px-3 py-1 type-label uppercase text-[var(--gold-bright)]">
                            {activeSlide.eyebrow}
                          </div>
                          <h2 className="mt-4 font-serif-display text-[clamp(28px,3vw,44px)] leading-[1.02] text-[var(--text-primary)]">
                            {activeSlide.title}
                          </h2>
                          <p className="mt-4 max-w-4xl type-body text-[var(--text-secondary)]">{activeSlide.description}</p>
                        </div>

                        {activeSlide.content}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      aria-label={`Go to ${slide.nav}`}
                      onClick={() => setActiveIndex(index)}
                      className={`h-2.5 rounded-full transition-[width,background-color] duration-200 ${
                        index === activeIndex ? 'w-10 bg-[var(--gold-base)]' : 'w-2.5 bg-[rgba(201,165,90,0.2)] hover:bg-[rgba(201,165,90,0.34)]'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <GoldButton
                    variant="ghost"
                    iconLeft={<ArrowLeft className="h-4 w-4" />}
                    onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
                    disabled={activeIndex === 0}
                    className={activeIndex === 0 ? 'pointer-events-none opacity-45' : ''}
                  >
                    Previous
                  </GoldButton>
                  <GoldButton
                    variant={activeIndex === slides.length - 1 ? 'primary' : 'secondary'}
                    iconRight={activeIndex === slides.length - 1 ? <WalletCards className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    onClick={() => {
                      if (activeIndex === slides.length - 1) {
                        closeDeck();
                        return;
                      }
                      setActiveIndex((current) => Math.min(current + 1, slides.length - 1));
                    }}
                  >
                    {activeIndex === slides.length - 1 ? 'Back to onboarding' : 'Next slide'}
                  </GoldButton>
                </div>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
