export const RESEARCH_DAILY_LIMIT = 5

export const PORTAL_FEATURES = [
  {
    key: 'crm',
    label: 'CRM',
    description: 'Pipeline visibility, lead operations, and business records.'
  },
  {
    key: 'leads',
    label: 'Leads',
    description: 'Lead list, record details, and export workflows.'
  },
  {
    key: 'automations',
    label: 'Automations',
    description: 'Automation visibility, agent activity, and delivery monitoring.'
  },
  {
    key: 'mailbox',
    label: 'Mailbox',
    description: 'Conversation history and mailbox activity for subscribed businesses.'
  },
  {
    key: 'marketResearch',
    label: 'Market Research',
    description: 'AI market intelligence reports, competitor analysis, and exports.'
  },
  {
    key: 'legalTools',
    label: 'Legal Tools',
    description: 'Legal notice drafting, delayed payment guidance, and notice exports.'
  },
  {
    key: 'reportHistory',
    label: 'Report History',
    description: 'Saved report library, read-only links, and export management.'
  },
  {
    key: 'profileSettings',
    label: 'Profile Settings',
    description: 'Stored business profile, profile editing, and reusable context.'
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    description: 'WhatsApp outreach campaigns and AI agent for automated conversations.'
  },
  {
    key: 'brandedEmail',
    label: 'Branded Email',
    description: 'A dedicated business.<yourname>@levitatelabs.online address for sending and receiving business email.'
  },
  {
    key: 'tenders',
    label: 'Government Tenders',
    description: 'Browse and filter live government tender listings matched to your industry and district.'
  },
  {
    key: 'marketplace',
    label: 'Marketplace Listings',
    description: 'Get your products listed on Amazon, Flipkart, and Meesho — with optional photography and tagging add-ons.'
  },
  {
    key: 'marketPulse',
    label: 'Market Pulse',
    description: 'Daily Indian stock market sentiment, news, and technicals — a starting point for where to park surplus business cash.'
  }
] as const

export type PortalFeatureKey = (typeof PORTAL_FEATURES)[number]['key']

export type PortalFeatureAccess = Record<PortalFeatureKey, boolean>

export const DEFAULT_PLAN_FEATURE_ACCESS: PortalFeatureAccess = {
  crm: true,
  leads: true,
  automations: true,
  mailbox: true,
  marketResearch: true,
  legalTools: true,
  reportHistory: true,
  profileSettings: true,
  whatsapp: true,
  // Fails closed (unlike the other flags above): a costed, per-mailbox perk that
  // should never silently unlock just because a plan's feature_controls row is
  // missing this newer key.
  brandedEmail: false,
  tenders: false,
  // Fails closed like brandedEmail/tenders above — every real plan explicitly
  // sets this true today, but a future plan created without configuring
  // feature_controls should not silently get a real-money feature for free.
  marketplace: false,
  // Fails closed — a premium data feature, should be an explicit per-plan
  // opt-in rather than a silent default unlock.
  marketPulse: false,
}

export type BusinessModelType =
  | 'B2B'
  | 'B2C'
  | 'D2C'
  | 'SaaS'
  | 'marketplace'
  | 'agency'
  | 'freelance'
  | 'manufacturing'
  | 'retail'
  | 'logistics'
  | 'healthcare'
  | 'edtech'
  | 'fintech'
  | 'other'

export type CompanyStageType =
  | 'idea_stage'
  | 'pre_revenue'
  | 'early_revenue'
  | 'growth_stage'
  | 'scaling'
  | 'established'

export type TeamSizeRange =
  | 'solo'
  | '2_5'
  | '6_15'
  | '16_50'
  | '51_200'
  | '200_plus'

export type LegalEntityType =
  | 'individual'
  | 'sole_proprietorship'
  | 'partnership'
  | 'llp'
  | 'private_limited'
  | 'public_limited'
  | 'other'

export type ResearchIntentType =
  | 'competitor'
  | 'market'
  | 'industry'
  | 'product_idea'
  | 'self_assessment'

export type ResearchModuleId =
  | 'business_profile'
  | 'competitor_intelligence'
  | 'market_sizing'
  | 'future_growth'
  | 'swot_analysis'
  | 'pestle_analysis'
  | 'customer_personas'
  | 'pricing_intelligence'
  | 'technology_landscape'
  | 'go_to_market'
  | 'funding_landscape'
  | 'risk_matrix'
  | 'industry_benchmarking'
  | 'regulatory_landscape'

export type ModuleRunStatus = 'pending' | 'loading' | 'complete' | 'failed'
export type ReportStatus = 'draft' | 'generating' | 'complete' | 'partial' | 'archived'
export type AccentTone = 'gold' | 'blue' | 'green' | 'red' | 'orange' | 'neutral'

export type BusinessProfilePayload = {
  businessName: string
  oneLineDescription: string
  industry: string
  subIndustry: string
  businessModelType: BusinessModelType
  primaryGeographies: string[]
  companyStage: CompanyStageType
  teamSizeRange: TeamSizeRange
  registrationStatus: LegalEntityType
  isMsmeRegistered: boolean
  annualRevenueBracket: string
  primarySalesChannels: string[]
  preferredTimezone: string
}

export type ResearchIntentPayload = {
  intentType: ResearchIntentType
  targetName: string
  targetUrl: string
  notes: string
}

export type ResearchRequestPayload = {
  profile: BusinessProfilePayload
  intent: ResearchIntentPayload
  selectedModules: ResearchModuleId[]
  timeZone: string
}

export type MetricCard = {
  label: string
  value: string
  detail?: string
  tone?: AccentTone
}

export type Chip = {
  label: string
  tone?: AccentTone
}

export type ProgressMeter = {
  label: string
  value: number
  minLabel?: string
  maxLabel?: string
  detail?: string
  tone?: AccentTone
}

export type DonutDatum = {
  name: string
  value: number
  color?: string
}

export type BarDatum = {
  label: string
  value: number
  detail?: string
  tone?: AccentTone
}

export type ScatterDatum = {
  name: string
  x: number
  y: number
  z: number
  detail?: string
  tone?: AccentTone
  highlight?: boolean
}

export type LineSeries = {
  name: string
  color?: string
  points: Array<{
    x: string
    y: number
    low?: number
    high?: number
  }>
}

export type RadarDatum = {
  label: string
  value: number
}

export type TableColumn = {
  key: string
  label: string
}

export type TableCell = {
  value: string
  tone?: AccentTone
}

export type TableRow = {
  id: string
  cells: Record<string, TableCell>
}

export type CardDetail = {
  label: string
  value: string
}

export type CardItem = {
  title: string
  subtitle?: string
  body?: string
  tone?: AccentTone
  badges?: Chip[]
  details?: CardDetail[]
}

export type ListItem = {
  title: string
  description: string
  tone?: AccentTone
}

export type ListSection = {
  title: string
  items: ListItem[]
}

export type Quadrant = {
  title: string
  tone?: AccentTone
  items: ListItem[]
}

export type RingDatum = {
  label: string
  value: string
  share: number
  growth?: string
}

export type HeatmapItem = {
  label: string
  impact: number
  probability: number
  detail?: string
  tone?: AccentTone
}

export type TimelineItem = {
  label: string
  start: string
  end?: string
  detail?: string
  tone?: AccentTone
}

export type Callout = {
  title: string
  body: string
  tone?: AccentTone
}

export type ResearchModulePayload = {
  summary: string
  score: number
  chips?: Chip[]
  metricCards?: MetricCard[]
  progressMeters?: ProgressMeter[]
  donutCharts?: Array<{ title: string; data: DonutDatum[] }>
  barCharts?: Array<{ title: string; data: BarDatum[]; orientation?: 'horizontal' | 'vertical' }>
  scatterPlots?: Array<{ title: string; xLabel: string; yLabel: string; data: ScatterDatum[] }>
  lineCharts?: Array<{ title: string; yLabel: string; series: LineSeries[] }>
  radarCharts?: Array<{ title: string; data: RadarDatum[] }>
  tables?: Array<{ title: string; columns: TableColumn[]; rows: TableRow[] }>
  cardGroups?: Array<{ title: string; columns?: number; cards: CardItem[] }>
  listSections?: ListSection[]
  quadrants?: Quadrant[]
  nestedRings?: { title: string; rings: RingDatum[]; footer?: string }
  heatmaps?: Array<{ title: string; items: HeatmapItem[] }>
  timelines?: Array<{ title: string; items: TimelineItem[] }>
  callout?: Callout
}

export type ResearchModuleResult = {
  id: ResearchModuleId
  title: string
  status: ModuleRunStatus
  provider?: string
  generatedAt?: string
  error?: string
  payload?: ResearchModulePayload
}

export type ResearchReportRecord = {
  id: string
  status: ReportStatus
  targetName: string
  targetType: ResearchIntentType
  targetUrl: string | null
  notes: string | null
  intelligenceScore: number | null
  reportSummary: string | null
  selectedModules: ResearchModuleId[]
  moduleResults: Record<string, ResearchModuleResult>
  shareToken: string | null
  createdAt: string
  archivedAt: string | null
  businessProfile: BusinessProfilePayload
}

export function isRecoverableResearchRateLimitMessage(value?: string | null) {
  if (!value) {
    return false
  }

  return /groq request failed\s*\(429\)|rate limit reached for model|try again in\s+\d+/i.test(value)
}

export type LegalNoticeSections = {
  header: string
  facts: string
  legalGrounds: string
  demand: string
  deadline: string
  consequences: string
  closing: string
}

export type LegalNoticeDraft = {
  title: string
  sections: LegalNoticeSections
}

export type LegalNoticeIntake = {
  senderName: string
  senderAddress: string
  senderContact: string
  senderEntityType: LegalEntityType
  recipientName: string
  recipientAddress: string
  recipientContact: string
  recipientEntityType: LegalEntityType
  transactionNature: string
  hasFormalContract: boolean
  agreedTerms: string
  agreementDate: string
  breachType: string
  principalAmount: string
  agreedInterest: string
  defaultPeriod: string
  priorCommunications: string
  partialPayments: string
  missedDeadlines: string
  noticeObjective: string
  advocateDetails: string
}

export type AdvisorInput = {
  amountBand: 'above_1_lakh' | 'below_1_lakh'
  hasWrittenContract: boolean
  hadCheque: boolean
  otherPartyIsRegisteredCompany: boolean
  isMsmeRegistered: boolean
}

export type DelayedPaymentOption = {
  id: string
  title: string
  explanation: string
  laws: string
  timeline: string
  recommendedFor: string
}

export const BUSINESS_MODEL_OPTIONS: Array<{ value: BusinessModelType; label: string }> = [
  { value: 'B2B', label: 'B2B' },
  { value: 'B2C', label: 'B2C' },
  { value: 'D2C', label: 'D2C' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'agency', label: 'Agency' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'edtech', label: 'EdTech' },
  { value: 'fintech', label: 'FinTech' },
  { value: 'other', label: 'Other' }
]

export const COMPANY_STAGE_OPTIONS: Array<{ value: CompanyStageType; label: string }> = [
  { value: 'idea_stage', label: 'Idea stage' },
  { value: 'pre_revenue', label: 'Pre-revenue' },
  { value: 'early_revenue', label: 'Early revenue under 10 lakhs / month' },
  { value: 'growth_stage', label: 'Growth stage 10 to 50 lakhs / month' },
  { value: 'scaling', label: 'Scaling above 50 lakhs / month' },
  { value: 'established', label: 'Established' }
]

export const TEAM_SIZE_OPTIONS: Array<{ value: TeamSizeRange; label: string }> = [
  { value: 'solo', label: 'Solo founder' },
  { value: '2_5', label: '2 to 5 people' },
  { value: '6_15', label: '6 to 15 people' },
  { value: '16_50', label: '16 to 50 people' },
  { value: '51_200', label: '51 to 200 people' },
  { value: '200_plus', label: '200 plus people' }
]

export const LEGAL_ENTITY_OPTIONS: Array<{ value: LegalEntityType; label: string }> = [
  { value: 'individual', label: 'Individual' },
  { value: 'sole_proprietorship', label: 'Sole proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llp', label: 'LLP' },
  { value: 'private_limited', label: 'Private limited' },
  { value: 'public_limited', label: 'Public limited' },
  { value: 'other', label: 'Other' }
]

export const RESEARCH_INTENT_OPTIONS: Array<{ value: ResearchIntentType; label: string }> = [
  { value: 'competitor', label: 'Competitor' },
  { value: 'market', label: 'Market' },
  { value: 'industry', label: 'Industry' },
  { value: 'product_idea', label: 'Product idea' },
  { value: 'self_assessment', label: 'Own business self-assessment' }
]

export const INDUSTRY_OPTIONS = [
  'SaaS',
  'Professional services',
  'D2C commerce',
  'Manufacturing',
  'Retail',
  'Food and beverage',
  'Healthcare',
  'EdTech',
  'FinTech',
  'Logistics',
  'Real estate',
  'Legal services',
  'HR and staffing',
  'Consumer internet',
  'Media and content',
  'Travel and hospitality',
  'Automotive',
  'Construction',
  'Agritech',
  'Climate and sustainability'
] as const

export const SALES_CHANNEL_OPTIONS = [
  'Inbound website leads',
  'Outbound sales',
  'Paid ads',
  'SEO and content',
  'Partner referrals',
  'Marketplaces',
  'Retail distribution',
  'WhatsApp sales',
  'Inside sales',
  'Field sales',
  'Social commerce',
  'Channel partners'
] as const

export const REGION_OPTIONS = [
  'India',
  'North India',
  'South India',
  'West India',
  'East India',
  'Middle East',
  'Southeast Asia',
  'Europe',
  'North America',
  'Global remote'
] as const

export const RESEARCH_MODULES: Array<{
  id: ResearchModuleId
  title: string
  shortLabel: string
  description: string
  anchor: string
}> = [
  {
    id: 'business_profile',
    title: 'Business Profile Analyser',
    shortLabel: 'Profile',
    description: 'Core business identity, value proposition, segments, and maturity.',
    anchor: 'business-profile'
  },
  {
    id: 'competitor_intelligence',
    title: 'Competitor Intelligence Engine',
    shortLabel: 'Competitors',
    description: 'Direct and indirect competitive positioning, pricing, and threat scores.',
    anchor: 'competitor-intelligence'
  },
  {
    id: 'market_sizing',
    title: 'Market Sizing - TAM SAM SOM',
    shortLabel: 'Market Size',
    description: 'Addressable market sizing, growth, and concentration signals.',
    anchor: 'market-sizing'
  },
  {
    id: 'future_growth',
    title: 'Future Growth Projector',
    shortLabel: 'Growth',
    description: '1, 3, and 5-year market opportunity scenarios and catalysts.',
    anchor: 'future-growth'
  },
  {
    id: 'swot_analysis',
    title: 'SWOT Analysis',
    shortLabel: 'SWOT',
    description: 'Detailed strengths, weaknesses, opportunities, and threats.',
    anchor: 'swot-analysis'
  },
  {
    id: 'pestle_analysis',
    title: 'PESTLE Analysis',
    shortLabel: 'PESTLE',
    description: 'Political, economic, social, technological, legal, and environmental forces.',
    anchor: 'pestle-analysis'
  },
  {
    id: 'customer_personas',
    title: 'Customer Persona Builder',
    shortLabel: 'Personas',
    description: 'Three detailed personas, motivations, objections, and alternatives.',
    anchor: 'customer-personas'
  },
  {
    id: 'pricing_intelligence',
    title: 'Pricing Intelligence Analyser',
    shortLabel: 'Pricing',
    description: 'Market pricing structures, price-to-value gaps, and recommendations.',
    anchor: 'pricing-intelligence'
  },
  {
    id: 'technology_landscape',
    title: 'Technology and Innovation Landscape',
    shortLabel: 'Technology',
    description: 'Industry tooling, AI adoption, disruption, and radar zones.',
    anchor: 'technology-landscape'
  },
  {
    id: 'go_to_market',
    title: 'Go-To-Market Strategy Analyser',
    shortLabel: 'GTM',
    description: 'Channel priorities, sales motion, positioning, and phased milestones.',
    anchor: 'go-to-market'
  },
  {
    id: 'funding_landscape',
    title: 'Investment and Funding Landscape',
    shortLabel: 'Funding',
    description: 'Deal activity, investor appetite, and fundability signals.',
    anchor: 'funding-landscape'
  },
  {
    id: 'risk_matrix',
    title: 'Risk Assessment Matrix',
    shortLabel: 'Risk',
    description: 'Probability-versus-impact heatmap with top mitigation priorities.',
    anchor: 'risk-assessment'
  },
  {
    id: 'industry_benchmarking',
    title: 'Industry Benchmarking',
    shortLabel: 'Benchmarking',
    description: 'Core KPI ranges, relative position, and benchmarking spider view.',
    anchor: 'industry-benchmarking'
  },
  {
    id: 'regulatory_landscape',
    title: 'Regulatory and Compliance Landscape',
    shortLabel: 'Compliance',
    description: 'Applicable Indian compliance requirements, risks, and incentive opportunities.',
    anchor: 'regulatory-landscape'
  }
]

export const DELAYED_PAYMENT_OPTIONS: DelayedPaymentOption[] = [
  {
    id: 'formal_notice',
    title: 'Option 1 - Send a Formal Legal Notice',
    explanation: 'Sending a formal notice under the Indian Contract Act is usually the first legal step before filing a suit. It places the defaulting party on record, creates immediate pressure, and often leads to a negotiated settlement without court action.',
    laws: 'Indian Contract Act 1872',
    timeline: '15 to 30 days for response',
    recommendedFor: 'Always the first step'
  },
  {
    id: 'msme_council',
    title: 'Option 2 - MSME Facilitation Council',
    explanation: 'If the aggrieved party is MSME registered, they can approach the MSME Facilitation Council in their state. Buyers are statutorily required to pay within 45 days under the MSMED Act 2006, and compound interest at three times the RBI bank rate applies automatically after that.',
    laws: 'MSME Development Act 2006, Sections 15 to 23',
    timeline: '90 to 180 days',
    recommendedFor: 'MSME sellers dealing with corporate or government buyers'
  },
  {
    id: 'summary_suit',
    title: 'Option 3 - Summary Suit under Order 37 CPC',
    explanation: 'For written contracts, promissory notes, or bills of exchange, a summary suit can be filed in the appropriate civil court. The defendant has limited grounds to defend, which usually makes this route faster than a regular civil suit.',
    laws: 'Code of Civil Procedure 1908, Order 37',
    timeline: '6 to 18 months',
    recommendedFor: 'Documented contractual disputes'
  },
  {
    id: 'cheque_dishonour',
    title: 'Option 4 - Cheque Dishonour Complaint under Section 138 NI Act',
    explanation: 'If a cheque was issued and bounced, the matter can proceed as a criminal complaint. A statutory demand notice must be sent within 30 days of dishonour, and the complaint must be filed within 30 days after the demand period ends.',
    laws: 'Negotiable Instruments Act 1881, Sections 138 to 142',
    timeline: '1 to 3 years',
    recommendedFor: 'Cheque bounce disputes'
  },
  {
    id: 'ibc',
    title: 'Option 5 - IBC Section 9 Operational Creditor Application',
    explanation: 'If the debtor is a company and the default exceeds 1 crore rupees, an operational creditor can initiate insolvency proceedings before the NCLT. This is a high-pressure remedy and often leads to settlement discussions very quickly.',
    laws: 'Insolvency and Bankruptcy Code 2016, Section 9',
    timeline: '14 to 180 days from admission',
    recommendedFor: 'Large disputes against corporate debtors'
  },
  {
    id: 'commercial_court',
    title: 'Option 6 - Commercial Court',
    explanation: 'Commercial disputes above 3 lakh rupees between commercial entities can move through dedicated commercial courts with faster procedures and mandatory pre-institution mediation.',
    laws: 'Commercial Courts Act 2015',
    timeline: '1 to 2 years',
    recommendedFor: 'Well-documented commercial disputes'
  },
  {
    id: 'arbitration',
    title: 'Option 7 - Arbitration',
    explanation: 'If the original contract contains an arbitration clause, arbitration can be invoked under the Arbitration and Conciliation Act 1996. It is generally faster and more private than regular civil litigation.',
    laws: 'Arbitration and Conciliation Act 1996',
    timeline: '6 to 18 months',
    recommendedFor: 'Parties seeking a private and faster resolution'
  },
  {
    id: 'consumer_forum',
    title: 'Option 8 - Consumer Forum',
    explanation: 'If the transaction is B2C and the issue relates to deficient service or unfair conduct by a business, the aggrieved party may approach the appropriate Consumer Disputes Redressal Commission with relatively low filing costs.',
    laws: 'Consumer Protection Act 2019',
    timeline: '3 months to 2 years',
    recommendedFor: 'Individual consumers against businesses'
  },
  {
    id: 'police_complaint',
    title: 'Option 9 - Police Complaint under BNS 2023',
    explanation: 'If there is evidence of fraudulent intent from the outset, such as deception, false identity, or deliberate inducement without intent to pay, a criminal complaint may be appropriate.',
    laws: 'Bharatiya Nyaya Sanhita 2023, Sections 316, 318, and 61',
    timeline: 'Varies by investigation and prosecution stage',
    recommendedFor: 'Cases involving genuine fraud rather than simple non-payment'
  }
]

export function normalizeFeatureAccess(value: unknown): PortalFeatureAccess {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_PLAN_FEATURE_ACCESS }
  }

  const input = value as Record<string, unknown>
  return PORTAL_FEATURES.reduce((acc, feature) => {
    acc[feature.key] = typeof input[feature.key] === 'boolean'
      ? Boolean(input[feature.key])
      : DEFAULT_PLAN_FEATURE_ACCESS[feature.key]
    return acc
  }, {} as PortalFeatureAccess)
}

export function getResearchModuleById(moduleId: ResearchModuleId) {
  return RESEARCH_MODULES.find(module => module.id === moduleId) ?? RESEARCH_MODULES[0]
}

export function normalizeSelectedModules(value: unknown): ResearchModuleId[] {
  if (!Array.isArray(value)) {
    return RESEARCH_MODULES.map(module => module.id)
  }

  const selected = value.filter((item): item is ResearchModuleId =>
    typeof item === 'string' && RESEARCH_MODULES.some(module => module.id === item)
  )

  return selected.length > 0 ? Array.from(new Set(selected)) : RESEARCH_MODULES.map(module => module.id)
}

const VALID_MODULE_STATUSES: ModuleRunStatus[] = ['pending', 'loading', 'complete', 'failed']
const VALID_ACCENT_TONES: AccentTone[] = ['gold', 'blue', 'green', 'red', 'orange', 'neutral']
const INVALID_RESEARCH_TEXT_PATTERNS = [
  /\bcompany\s+[a-z]\b/i,
  /\bcompetitor\s*\d+\b/i,
  /\bexample competitor\b/i,
  /\bsample company\b/i,
  /\b(?:strength|weakness|opportunity|threat)\s+\d+\b/i,
  /\b(?:strength|weakness|opportunity|threat)\s+insight\s+\d+\b/i,
  /\binsight\s+\d+\s+for\s+.+\s+viewed through the lens of\s+.+/i,
  /\bplaceholder\b/i,
  /\bmock(?:\s+data)?\b/i,
  /\bdemo(?:\s+data)?\b/i,
  /\bfake(?:\s+data)?\b/i,
  /\btbd\b/i,
  /\bto be determined\b/i,
  /\bproblem solving operator\b/i,
  /\bcurrent modeled position:\b/i,
  /\bbenchmark spider chart\b/i,
  /\b(?:[a-z][\w&-]*\s+){1,3}(?:prime|plus|edge|nexus|works|benchmark)\b/i,
]

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function asOptionalString(value: unknown) {
  const normalized = asString(value)
  return normalized || undefined
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function asBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false
}

function asTone(value: unknown): AccentTone | undefined {
  return typeof value === 'string' && VALID_ACCENT_TONES.includes(value as AccentTone)
    ? (value as AccentTone)
    : undefined
}

function optionalArray<T>(value: T[]) {
  return value.length > 0 ? value : undefined
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildTargetResearchPatterns(targetName?: string) {
  const normalized = asString(targetName)
  if (!normalized || normalized.length < 3) {
    return INVALID_RESEARCH_TEXT_PATTERNS
  }

  return INVALID_RESEARCH_TEXT_PATTERNS.concat([
    new RegExp(`\\b${escapeRegExp(normalized)}\\s+(?:prime|plus|edge|nexus|works|benchmark)\\b`, 'i'),
  ])
}

function hasInvalidResearchText(value: unknown, targetName?: string) {
  const normalized = asString(value)
  if (!normalized) {
    return false
  }

  return buildTargetResearchPatterns(targetName).some((pattern) => pattern.test(normalized))
}

function sanitizeOptionalResearchText(value: unknown, targetName?: string) {
  const normalized = asOptionalString(value)
  if (!normalized || hasInvalidResearchText(normalized, targetName)) {
    return undefined
  }

  return normalized
}

function normalizeChip(value: unknown, targetName?: string): Chip | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const label = asString(candidate.label)
  if (!label || hasInvalidResearchText(label, targetName)) {
    return null
  }

  return {
    label,
    tone: asTone(candidate.tone),
  }
}

function normalizeMetricCard(value: unknown, targetName?: string): MetricCard | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const label = asString(candidate.label)
  const cardValue = asString(candidate.value)
  if (!label || !cardValue || hasInvalidResearchText(label, targetName) || hasInvalidResearchText(cardValue, targetName)) {
    return null
  }

  return {
    label,
    value: cardValue,
    detail: sanitizeOptionalResearchText(candidate.detail, targetName),
    tone: asTone(candidate.tone),
  }
}

function normalizeProgressMeter(value: unknown, targetName?: string): ProgressMeter | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const label = asString(candidate.label)
  if (!label || hasInvalidResearchText(label, targetName)) {
    return null
  }

  return {
    label,
    value: Math.max(0, Math.min(100, Math.round(asNumber(candidate.value, 0)))),
    minLabel: sanitizeOptionalResearchText(candidate.minLabel, targetName),
    maxLabel: sanitizeOptionalResearchText(candidate.maxLabel, targetName),
    detail: sanitizeOptionalResearchText(candidate.detail, targetName),
    tone: asTone(candidate.tone),
  }
}

function normalizeDonutDatum(value: unknown, targetName?: string): DonutDatum | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const name = asString(candidate.name)
  if (!name || hasInvalidResearchText(name, targetName)) {
    return null
  }

  return {
    name,
    value: Math.max(0, Math.round(asNumber(candidate.value, 0))),
    color: asOptionalString(candidate.color),
  }
}

function normalizeBarDatum(value: unknown, targetName?: string): BarDatum | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const label = asString(candidate.label)
  if (!label || hasInvalidResearchText(label, targetName)) {
    return null
  }

  return {
    label,
    value: Math.max(0, asNumber(candidate.value, 0)),
    detail: sanitizeOptionalResearchText(candidate.detail, targetName),
    tone: asTone(candidate.tone),
  }
}

function normalizeScatterDatum(value: unknown, targetName?: string): ScatterDatum | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const name = asString(candidate.name)
  if (!name || hasInvalidResearchText(name, targetName)) {
    return null
  }

  return {
    name,
    x: asNumber(candidate.x, 0),
    y: asNumber(candidate.y, 0),
    z: Math.max(1, asNumber(candidate.z, 1)),
    detail: sanitizeOptionalResearchText(candidate.detail, targetName),
    tone: asTone(candidate.tone),
    highlight: asBoolean(candidate.highlight),
  }
}

function normalizeLineSeries(value: unknown, targetName?: string): LineSeries | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const name = asString(candidate.name)
  if (!name || hasInvalidResearchText(name, targetName)) {
    return null
  }

  const points = asArray(candidate.points)
    .map(point => {
      const pointCandidate = asRecord(point)
      if (!pointCandidate) {
        return null
      }

      const x = asString(pointCandidate.x)
      if (!x || hasInvalidResearchText(x, targetName)) {
        return null
      }

      return {
        x,
        y: asNumber(pointCandidate.y, 0),
        low: typeof pointCandidate.low === 'number' && Number.isFinite(pointCandidate.low)
          ? pointCandidate.low
          : undefined,
        high: typeof pointCandidate.high === 'number' && Number.isFinite(pointCandidate.high)
          ? pointCandidate.high
          : undefined,
      }
    })
    .filter((point) => point !== null) as LineSeries['points']

  if (points.length === 0) {
    return null
  }

  return {
    name,
    color: asOptionalString(candidate.color),
    points,
  }
}

function normalizeRadarDatum(value: unknown, targetName?: string): RadarDatum | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const label = asString(candidate.label)
  if (!label || hasInvalidResearchText(label, targetName)) {
    return null
  }

  return {
    label,
    value: Math.max(0, Math.round(asNumber(candidate.value, 0))),
  }
}

function normalizeTableColumn(value: unknown, targetName?: string): TableColumn | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const key = asString(candidate.key)
  const label = asString(candidate.label)
  if (!key || !label || hasInvalidResearchText(label, targetName)) {
    return null
  }

  return { key, label }
}

function normalizeTableRow(value: unknown, targetName?: string): TableRow | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const id = asString(candidate.id)
  const cellsRecord = asRecord(candidate.cells) ?? {}
  const cells = Object.entries(cellsRecord).reduce((acc, [key, cellValue]) => {
    const cellCandidate = asRecord(cellValue)
    const cellText = asString(cellCandidate?.value)
    if (!cellText || hasInvalidResearchText(cellText, targetName)) {
      return acc
    }

    acc[key] = {
      value: cellText,
      tone: asTone(cellCandidate?.tone),
    }
    return acc
  }, {} as Record<string, TableCell>)

  if (!id || Object.keys(cells).length === 0) {
    return null
  }

  return { id, cells }
}

function normalizeCardDetail(value: unknown, targetName?: string): CardDetail | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const label = asString(candidate.label)
  const detailValue = asString(candidate.value)
  if (!label || !detailValue || hasInvalidResearchText(label, targetName) || hasInvalidResearchText(detailValue, targetName)) {
    return null
  }

  return {
    label,
    value: detailValue,
  }
}

function normalizeCardItem(value: unknown, targetName?: string): CardItem | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const title = asString(candidate.title)
  if (!title || hasInvalidResearchText(title, targetName)) {
    return null
  }

  return {
    title,
    subtitle: sanitizeOptionalResearchText(candidate.subtitle, targetName),
    body: sanitizeOptionalResearchText(candidate.body, targetName),
    tone: asTone(candidate.tone),
    badges: optionalArray(asArray(candidate.badges).map((item) => normalizeChip(item, targetName)).filter((item): item is Chip => Boolean(item))),
    details: optionalArray(asArray(candidate.details).map((item) => normalizeCardDetail(item, targetName)).filter((item): item is CardDetail => Boolean(item))),
  }
}

function normalizeListItem(value: unknown, targetName?: string): ListItem | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const title = asString(candidate.title)
  const description = asString(candidate.description)
  if (!title || !description || hasInvalidResearchText(title, targetName) || hasInvalidResearchText(description, targetName)) {
    return null
  }

  return {
    title,
    description,
    tone: asTone(candidate.tone),
  }
}

function normalizeListSection(value: unknown, targetName?: string): ListSection | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const title = asString(candidate.title)
  if (!title || hasInvalidResearchText(title, targetName)) {
    return null
  }

  const items = asArray(candidate.items).map((item) => normalizeListItem(item, targetName)).filter((item): item is ListItem => Boolean(item))
  if (items.length === 0) {
    return null
  }

  return { title, items }
}

function normalizeQuadrant(value: unknown, targetName?: string): Quadrant | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const title = asString(candidate.title)
  if (!title || hasInvalidResearchText(title, targetName)) {
    return null
  }

  const items = asArray(candidate.items).map((item) => normalizeListItem(item, targetName)).filter((item): item is ListItem => Boolean(item))
  if (items.length === 0) {
    return null
  }

  return {
    title,
    tone: asTone(candidate.tone),
    items,
  }
}

function normalizeRingDatum(value: unknown, targetName?: string): RingDatum | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const label = asString(candidate.label)
  const ringValue = asString(candidate.value)
  if (!label || !ringValue || hasInvalidResearchText(label, targetName) || hasInvalidResearchText(ringValue, targetName)) {
    return null
  }

  return {
    label,
    value: ringValue,
    share: Math.max(0, Math.round(asNumber(candidate.share, 0))),
    growth: asOptionalString(candidate.growth),
  }
}

function normalizeHeatmapItem(value: unknown, targetName?: string): HeatmapItem | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const label = asString(candidate.label)
  if (!label || hasInvalidResearchText(label, targetName)) {
    return null
  }

  return {
    label,
    impact: Math.max(1, Math.min(5, Math.round(asNumber(candidate.impact, 1)))),
    probability: Math.max(1, Math.min(5, Math.round(asNumber(candidate.probability, 1)))),
    detail: sanitizeOptionalResearchText(candidate.detail, targetName),
    tone: asTone(candidate.tone),
  }
}

function normalizeTimelineItem(value: unknown, targetName?: string): TimelineItem | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const label = asString(candidate.label)
  const start = asString(candidate.start)
  if (!label || !start || hasInvalidResearchText(label, targetName) || hasInvalidResearchText(start, targetName)) {
    return null
  }

  return {
    label,
    start,
    end: sanitizeOptionalResearchText(candidate.end, targetName),
    detail: sanitizeOptionalResearchText(candidate.detail, targetName),
    tone: asTone(candidate.tone),
  }
}

function normalizeCallout(value: unknown, targetName?: string): Callout | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const title = asString(candidate.title)
  const body = asString(candidate.body)
  if (!title || !body || hasInvalidResearchText(title, targetName) || hasInvalidResearchText(body, targetName)) {
    return null
  }

  return {
    title,
    body,
    tone: asTone(candidate.tone),
  }
}

export function normalizeResearchModulePayload(value: unknown, targetName?: string): ResearchModulePayload | null {
  const candidate = asRecord(value)
  if (!candidate) {
    return null
  }

  const summary = asString(candidate.summary)
  const rawScore = asNumber(candidate.score, Number.NaN)
  if (!summary || !Number.isFinite(rawScore) || hasInvalidResearchText(summary, targetName)) {
    return null
  }

  const chips = asArray(candidate.chips).map((item) => normalizeChip(item, targetName)).filter((item): item is Chip => Boolean(item))
  const metricCards = asArray(candidate.metricCards).map((item) => normalizeMetricCard(item, targetName)).filter((item): item is MetricCard => Boolean(item))
  const progressMeters = asArray(candidate.progressMeters).map((item) => normalizeProgressMeter(item, targetName)).filter((item): item is ProgressMeter => Boolean(item))
  const donutCharts = asArray(candidate.donutCharts)
    .map(chart => {
      const chartCandidate = asRecord(chart)
      if (!chartCandidate) {
        return null
      }

      const title = asString(chartCandidate.title)
      const data = asArray(chartCandidate.data).map((item) => normalizeDonutDatum(item, targetName)).filter((item): item is DonutDatum => Boolean(item))
      if (!title || hasInvalidResearchText(title, targetName) || data.length === 0) {
        return null
      }

      return { title, data }
    })
    .filter((item): item is NonNullable<ResearchModulePayload['donutCharts']>[number] => Boolean(item))
  const barCharts = asArray(candidate.barCharts)
    .map(chart => {
      const chartCandidate = asRecord(chart)
      if (!chartCandidate) {
        return null
      }

      const title = asString(chartCandidate.title)
      const data = asArray(chartCandidate.data).map((item) => normalizeBarDatum(item, targetName)).filter((item): item is BarDatum => Boolean(item))
      if (!title || hasInvalidResearchText(title, targetName) || data.length === 0) {
        return null
      }

      return {
        title,
        data,
        orientation: (chartCandidate.orientation === 'horizontal' ? 'horizontal' : 'vertical') as 'horizontal' | 'vertical',
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item)) as NonNullable<ResearchModulePayload['barCharts']>
  const scatterPlots = asArray(candidate.scatterPlots)
    .map(chart => {
      const chartCandidate = asRecord(chart)
      if (!chartCandidate) {
        return null
      }

      const title = asString(chartCandidate.title)
      const xLabel = asString(chartCandidate.xLabel)
      const yLabel = asString(chartCandidate.yLabel)
      const data = asArray(chartCandidate.data).map((item) => normalizeScatterDatum(item, targetName)).filter((item): item is ScatterDatum => Boolean(item))
      if (!title || !xLabel || !yLabel || hasInvalidResearchText(title, targetName) || hasInvalidResearchText(xLabel, targetName) || hasInvalidResearchText(yLabel, targetName) || data.length === 0) {
        return null
      }

      return { title, xLabel, yLabel, data }
    })
    .filter((item): item is NonNullable<ResearchModulePayload['scatterPlots']>[number] => Boolean(item))
  const lineCharts = asArray(candidate.lineCharts)
    .map(chart => {
      const chartCandidate = asRecord(chart)
      if (!chartCandidate) {
        return null
      }

      const title = asString(chartCandidate.title)
      const yLabel = asString(chartCandidate.yLabel)
      const series = asArray(chartCandidate.series).map((item) => normalizeLineSeries(item, targetName)).filter((item): item is LineSeries => Boolean(item))
      if (!title || !yLabel || hasInvalidResearchText(title, targetName) || hasInvalidResearchText(yLabel, targetName) || series.length === 0) {
        return null
      }

      return { title, yLabel, series }
    })
    .filter((item): item is NonNullable<ResearchModulePayload['lineCharts']>[number] => Boolean(item))
  const radarCharts = asArray(candidate.radarCharts)
    .map(chart => {
      const chartCandidate = asRecord(chart)
      if (!chartCandidate) {
        return null
      }

      const title = asString(chartCandidate.title)
      const data = asArray(chartCandidate.data).map((item) => normalizeRadarDatum(item, targetName)).filter((item): item is RadarDatum => Boolean(item))
      if (!title || hasInvalidResearchText(title, targetName) || data.length === 0) {
        return null
      }

      return { title, data }
    })
    .filter((item): item is NonNullable<ResearchModulePayload['radarCharts']>[number] => Boolean(item))
  const tables = asArray(candidate.tables)
    .map(table => {
      const tableCandidate = asRecord(table)
      if (!tableCandidate) {
        return null
      }

      const title = asString(tableCandidate.title)
      const columns = asArray(tableCandidate.columns).map((item) => normalizeTableColumn(item, targetName)).filter((item): item is TableColumn => Boolean(item))
      const rows = asArray(tableCandidate.rows).map((item) => normalizeTableRow(item, targetName)).filter((item): item is TableRow => Boolean(item))
      if (!title || hasInvalidResearchText(title, targetName) || columns.length === 0 || rows.length === 0) {
        return null
      }

      return { title, columns, rows }
    })
    .filter((item): item is NonNullable<ResearchModulePayload['tables']>[number] => Boolean(item))
  const cardGroups = asArray(candidate.cardGroups)
    .map(group => {
      const groupCandidate = asRecord(group)
      if (!groupCandidate) {
        return null
      }

      const title = asString(groupCandidate.title)
      const cards = asArray(groupCandidate.cards).map((item) => normalizeCardItem(item, targetName)).filter((item): item is CardItem => Boolean(item))
      if (!title || hasInvalidResearchText(title, targetName) || cards.length === 0) {
        return null
      }

      const normalizedColumns = asNumber(groupCandidate.columns, 2)
      return {
        title,
        columns: normalizedColumns === 4 ? 4 : normalizedColumns === 3 ? 3 : 2,
        cards,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item)) as NonNullable<ResearchModulePayload['cardGroups']>
  const listSections = asArray(candidate.listSections).map((item) => normalizeListSection(item, targetName)).filter((item): item is ListSection => Boolean(item))
  const quadrants = asArray(candidate.quadrants).map((item) => normalizeQuadrant(item, targetName)).filter((item): item is Quadrant => Boolean(item))
  const nestedRingCandidate = asRecord(candidate.nestedRings)
  const nestedRings = nestedRingCandidate
    ? (() => {
        const title = asString(nestedRingCandidate.title)
        const rings = asArray(nestedRingCandidate.rings).map((item) => normalizeRingDatum(item, targetName)).filter((item): item is RingDatum => Boolean(item))
        if (!title || hasInvalidResearchText(title, targetName) || rings.length === 0) {
          return undefined
        }

        return {
          title,
          rings,
          footer: sanitizeOptionalResearchText(nestedRingCandidate.footer, targetName),
        }
      })()
    : undefined
  const heatmaps = asArray(candidate.heatmaps)
    .map(heatmap => {
      const heatmapCandidate = asRecord(heatmap)
      if (!heatmapCandidate) {
        return null
      }

      const title = asString(heatmapCandidate.title)
      const items = asArray(heatmapCandidate.items).map((item) => normalizeHeatmapItem(item, targetName)).filter((item): item is HeatmapItem => Boolean(item))
      if (!title || hasInvalidResearchText(title, targetName) || items.length === 0) {
        return null
      }

      return { title, items }
    })
    .filter((item): item is NonNullable<ResearchModulePayload['heatmaps']>[number] => Boolean(item))
  const timelines = asArray(candidate.timelines)
    .map(timeline => {
      const timelineCandidate = asRecord(timeline)
      if (!timelineCandidate) {
        return null
      }

      const title = asString(timelineCandidate.title)
      const items = asArray(timelineCandidate.items).map((item) => normalizeTimelineItem(item, targetName)).filter((item): item is TimelineItem => Boolean(item))
      if (!title || hasInvalidResearchText(title, targetName) || items.length === 0) {
        return null
      }

      return { title, items }
    })
    .filter((item): item is NonNullable<ResearchModulePayload['timelines']>[number] => Boolean(item))
  const callout = normalizeCallout(candidate.callout, targetName) ?? undefined

  return {
    summary,
    score: Math.max(1, Math.min(100, Math.round(rawScore))),
    chips: optionalArray(chips),
    metricCards: optionalArray(metricCards),
    progressMeters: optionalArray(progressMeters),
    donutCharts: optionalArray(donutCharts),
    barCharts: optionalArray(barCharts),
    scatterPlots: optionalArray(scatterPlots),
    lineCharts: optionalArray(lineCharts),
    radarCharts: optionalArray(radarCharts),
    tables: optionalArray(tables),
    cardGroups: optionalArray(cardGroups),
    listSections: optionalArray(listSections),
    quadrants: optionalArray(quadrants),
    nestedRings,
    heatmaps: optionalArray(heatmaps),
    timelines: optionalArray(timelines),
    callout,
  }
}

export function normalizeResearchModuleResults(value: unknown, targetName?: string): Record<string, ResearchModuleResult> {
  const rawResults = asRecord(value)
  if (!rawResults) {
    return {}
  }

  return Object.entries(rawResults).reduce((acc, [moduleId, resultValue]) => {
    if (!RESEARCH_MODULES.some(module => module.id === moduleId)) {
      return acc
    }

    const moduleMeta = getResearchModuleById(moduleId as ResearchModuleId)
    const result = asRecord(resultValue)
    const requestedStatus = typeof result?.status === 'string' && VALID_MODULE_STATUSES.includes(result.status as ModuleRunStatus)
      ? (result.status as ModuleRunStatus)
      : 'pending'
    const provider = asOptionalString(result?.provider)
    const providerRejected = Boolean(provider && /\bfallback\b/i.test(provider))
    const rawPayloadSerialized = result?.payload ? JSON.stringify(result.payload) : ''
    const rawPayloadRejected = Boolean(rawPayloadSerialized && hasInvalidResearchText(rawPayloadSerialized, targetName))
    const payload = providerRejected ? undefined : normalizeResearchModulePayload(result?.payload, targetName) ?? undefined
    const payloadRejected = providerRejected || rawPayloadRejected || (Boolean(result?.payload) && !payload)
    const status = payloadRejected && requestedStatus === 'complete' ? 'failed' : requestedStatus
    const rejectionReason = providerRejected
      ? 'This section was discarded because the saved research content came from an unsupported fallback source.'
      : rawPayloadRejected
        ? 'This section was discarded because the saved research content included placeholder or unsupported evidence.'
        : 'This section was discarded because the saved research content did not meet LevitateOS evidence rules.'

    acc[moduleId] = {
      id: moduleId as ResearchModuleId,
      title: asString(result?.title, moduleMeta.title) || moduleMeta.title,
      status,
      provider,
      generatedAt: asOptionalString(result?.generatedAt),
      error: payloadRejected && requestedStatus === 'complete'
        ? rejectionReason
        : asOptionalString(result?.error),
      payload,
    }
    return acc
  }, {} as Record<string, ResearchModuleResult>)
}

export function buildPendingModuleResults(moduleIds: ResearchModuleId[]): Record<string, ResearchModuleResult> {
  return moduleIds.reduce((acc, moduleId) => {
    const moduleMeta = getResearchModuleById(moduleId)
    acc[moduleId] = {
      id: moduleId,
      title: moduleMeta.title,
      status: 'pending'
    }
    return acc
  }, {} as Record<string, ResearchModuleResult>)
}

export function averageModuleScore(results: Record<string, ResearchModuleResult>) {
  const scores = Object.values(results)
    .map(result => result.payload?.score)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))

  if (scores.length === 0) {
    return null
  }

  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
}

export function getModuleCompletionState(results: Record<string, ResearchModuleResult>, selectedModules: ResearchModuleId[]): ReportStatus {
  const selected = selectedModules.map(moduleId => results[moduleId]).filter(Boolean)

  if (selected.length === 0) {
    return 'draft'
  }

  const completedCount = selected.filter(result => result.status === 'complete').length
  const failedCount = selected.filter(result => result.status === 'failed').length

  if (completedCount === selected.length) {
    return 'complete'
  }

  if (completedCount > 0 && completedCount + failedCount === selected.length) {
    return 'partial'
  }

  return 'generating'
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  return formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value
    }
    return acc
  }, {} as Record<string, string>)
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone)
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  )
  return asUtc - date.getTime()
}

function zonedDateToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number, timeZone: string) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  return new Date(utcGuess.getTime() - getTimeZoneOffsetMs(utcGuess, timeZone))
}

export function getCalendarDayRange(timeZone: string, baseDate = new Date()) {
  const parts = getTimeZoneParts(baseDate, timeZone)
  const year = Number(parts.year)
  const month = Number(parts.month)
  const day = Number(parts.day)

  return {
    start: zonedDateToUtc(year, month, day, 0, 0, 0, timeZone),
    end: zonedDateToUtc(year, month, day, 23, 59, 59, timeZone)
  }
}

export function formatQuotaDayLabel(timeZone: string, baseDate = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    dateStyle: 'medium'
  }).format(baseDate)
}

export function isReportArchived(createdAt: string, now = new Date()) {
  const created = new Date(createdAt)
  return now.getTime() - created.getTime() > 30 * 24 * 60 * 60 * 1000
}

export function reportToPlainText(report: ResearchReportRecord) {
  const sections: string[] = [
    `${report.targetName} - LevitateOS Intelligence Report`,
    `Generated: ${new Date(report.createdAt).toLocaleString('en-IN')}`,
    `Intelligence Score: ${report.intelligenceScore ?? 'Pending'}`,
    `Business Context: ${report.businessProfile.businessName || 'Not provided'}`,
    ''
  ]

  for (const moduleId of report.selectedModules) {
    const moduleResult = report.moduleResults[moduleId]
    if (!moduleResult) continue
    sections.push(moduleResult.title)
    sections.push(`Status: ${moduleResult.status}`)
    if (moduleResult.payload?.summary) {
      sections.push(moduleResult.payload.summary)
    }
    if (moduleResult.payload?.callout) {
      sections.push(`${moduleResult.payload.callout.title}: ${moduleResult.payload.callout.body}`)
    }
    sections.push('')
  }

  return sections.join('\n')
}

export function legalNoticeToPlainText(draft: LegalNoticeDraft) {
  return [
    draft.title,
    '',
    draft.sections.header,
    '',
    draft.sections.facts,
    '',
    draft.sections.legalGrounds,
    '',
    draft.sections.demand,
    '',
    draft.sections.deadline,
    '',
    draft.sections.consequences,
    '',
    draft.sections.closing
  ].join('\n')
}
