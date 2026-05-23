export type BillingCycle = 'monthly' | 'annual'

export interface OnboardingPlan {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  monthly_price: number
  annual_price: number
  monthly_setup_fee: number
  annual_setup_fee: number
  monthly_razorpay_plan_id: string | null
  annual_razorpay_plan_id: string | null
  features: string[] | null
  highlights: string[] | null
  deliverables: string[] | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  cta_label: string
  support_level: string
  feature_controls?: Record<string, boolean> | null
}

export interface OnboardingContent {
  eyebrow: string
  title: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
  trustItems: string[]
  faqs: Array<{ q: string; a: string }>
}

export const DEFAULT_ONBOARDING_CONTENT: OnboardingContent = {
  eyebrow: 'Levitate Labs Onboarding',
  title: 'Launch LevitateOS for your business',
  subtitle: 'Get your CRM, lead capture, WhatsApp and email automation, and growth ops dashboard live in one rollout.',
  primaryCta: 'Start monthly',
  secondaryCta: 'Pay annually and save',
  trustItems: [
    'Business-ready CRM with pipeline structure',
    'Lead capture and follow-up system setup',
    'Email and WhatsApp automation activation',
    'Performance dashboard for your team',
    'Branded workspace route on levitatelabs.online/your-company',
    'Meta and LinkedIn rollout support options'
  ],
  faqs: [
    { q: 'Do we get a CRM with this?', a: 'Yes. Your Business dashboard includes CRM structure for stages, ownership, and lifecycle tracking.' },
    { q: 'Do you set up WhatsApp and email?', a: 'Yes. We configure core WhatsApp and email automation layers as part of your rollout.' },
    { q: 'Can we include Meta and LinkedIn?', a: 'Yes. Meta and LinkedIn modules are added based on your subscribed scope.' },
    { q: 'How fast does onboarding start?', a: 'Most businesses begin rollout within 48 to 72 hours after payment confirmation.' },
    { q: 'Can we change plan after starting?', a: 'Yes. We can move you to higher scope tiers as your growth engine expands.' },
    { q: 'What happens after payment?', a: 'Your subscription turns active, confirmation is sent, and full Business dashboard access unlocks.' },
    { q: 'Where does payment happen?', a: 'Payment happens only after login/register, inside the Business dashboard subscribe flow.' },
    { q: 'How is the branded workspace URL created?', a: 'Each business gets a clean path-based route like levitatelabs.online/your-company instead of a subdomain.' }
  ]
}

export const RESERVED_WORKSPACE_SLUGS = [
  'admin',
  'api',
  'blog',
  'business',
  'careers',
  'company',
  'feed.xml',
  'invite',
  'login',
  'onboard',
  'reset-password',
  'services',
  'shared',
  'site',
  'sitemap.xml',
] as const

export function isReservedWorkspaceSlug(slug: string) {
  return RESERVED_WORKSPACE_SLUGS.includes(slug as (typeof RESERVED_WORKSPACE_SLUGS)[number])
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function ensureWorkspaceSlug(companyName: string) {
  return slugify(companyName) || 'company'
}

export function getWorkspacePath(slug: string) {
  return `/${slug}`
}

export function getWorkspaceUrl(slug: string, appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://levitatelabs.online') {
  const normalizedAppUrl = appUrl.replace(/\/$/, '')
  return `${normalizedAppUrl}${getWorkspacePath(slug)}`
}

// Backwards-compatible aliases while the rest of the codebase moves away from
// the older subdomain wording.
export const ensureSubdomainSlug = ensureWorkspaceSlug
export const getSubdomainUrl = getWorkspaceUrl

export function parseContent(value: unknown): OnboardingContent {
  if (!value) return DEFAULT_ONBOARDING_CONTENT
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as Partial<OnboardingContent>
      return { ...DEFAULT_ONBOARDING_CONTENT, ...parsed }
    } catch {
      return DEFAULT_ONBOARDING_CONTENT
    }
  }
  if (typeof value === 'object') {
    return { ...DEFAULT_ONBOARDING_CONTENT, ...(value as Partial<OnboardingContent>) }
  }
  return DEFAULT_ONBOARDING_CONTENT
}

export function getPlanPrice(plan: OnboardingPlan, billingCycle: BillingCycle) {
  return billingCycle === 'annual' ? Number(plan.annual_price) : Number(plan.monthly_price)
}

export function getPlanSetupFee(plan: OnboardingPlan, billingCycle: BillingCycle) {
  return billingCycle === 'annual' ? Number(plan.annual_setup_fee) : Number(plan.monthly_setup_fee)
}
