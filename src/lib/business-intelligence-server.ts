import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { load } from 'cheerio'
import { search as searchDuckDuckGo, SafeSearchType } from 'duck-duck-scrape'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import { jsPDF } from 'jspdf'
import { callAI } from '@/lib/ai/router'
import { getBusinessPortalState } from '@/lib/business-portal'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env'
import { getServiceSupabase } from '@/lib/supabase'
import {
  averageModuleScore,
  type AdvisorInput,
  type BusinessProfilePayload,
  type Chip,
  DELAYED_PAYMENT_OPTIONS,
  type HeatmapItem,
  type LegalNoticeDraft,
  type LegalNoticeIntake,
  legalNoticeToPlainText,
  type MetricCard,
  type PortalFeatureKey,
  RESEARCH_DAILY_LIMIT,
  getCalendarDayRange,
  getModuleCompletionState,
  getResearchModuleById,
  normalizeResearchModulePayload,
  normalizeResearchModuleResults,
  normalizeSelectedModules,
  type ProgressMeter,
  type ResearchModuleId,
  type ResearchModulePayload,
  type ResearchModuleResult,
  type ResearchReportRecord,
  type ResearchRequestPayload,
  reportToPlainText,
  type TableCell,
  type TableColumn,
  type TableRow,
} from '@/lib/business-intelligence'

type BusinessApiContext = {
  userId: string
  accountEmail: string | null
  portal: Awaited<ReturnType<typeof getBusinessPortalState>>['portal']
}

type ReportRow = {
  id: string
  status: string | null
  target_name: string
  target_type: string
  target_url: string | null
  notes: string | null
  intelligence_score: number | null
  report_summary: string | null
  selected_modules: unknown
  module_results: unknown
  share_token: string | null
  created_at: string
  archived_at: string | null
  business_profile: unknown
}

class GroqRateLimitError extends Error {
  retryAfterSeconds: number

  constructor(message: string, retryAfterSeconds: number) {
    super(message)
    this.name = 'GroqRateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

function hashString(input: string) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    const fenced = value.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? value.match(/\{[\s\S]*\}/)?.[0]
    if (!fenced) {
      return null
    }

    try {
      return JSON.parse(fenced) as T
    } catch {
      return null
    }
  }
}

function asCell(value: string | number, tone?: TableCell['tone']): TableCell {
  return {
    value: String(value),
    tone,
  }
}

function allowMockBusinessIntelligence() {
  return false
}

function parseGroqRetryAfterSeconds(errorBody: string) {
  const fromMessage = errorBody.match(/try again in\s+(\d+)/i)?.[1]
  const fromRetryAfter = errorBody.match(/"retry_after"\s*:\s*(\d+)/i)?.[1]
  const parsed = Number(fromMessage ?? fromRetryAfter ?? '')
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20
}

const WEBSITE_SIGNAL_CACHE = new Map<string, { value: string; expiresAt: number }>()

function dedupeStrings(values: string[], maxItems = values.length) {
  return Array.from(
    new Set(
      values
        .map(value => value.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
    )
  ).slice(0, maxItems)
}

function truncateSignalValue(value: string, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return ''
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized
}

function normalizeTargetUrl(targetUrl: string) {
  const normalized = targetUrl.trim()
  if (!normalized) {
    return ''
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized
  }

  return `https://${normalized}`
}

function getHostLabel(targetUrl: string) {
  try {
    return new URL(targetUrl).hostname.replace(/^www\./i, '')
  } catch {
    return ''
  }
}

function resolveHref(baseUrl: string, href: string) {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return ''
  }
}

function collectSchemaTypes(page: ReturnType<typeof load>) {
  const collected: string[] = []

  page('script[type="application/ld+json"]').each((_, node) => {
    const raw = page(node).text().trim()
    if (!raw) {
      return
    }

    const visitValue = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(visitValue)
        return
      }

      if (!value || typeof value !== 'object') {
        return
      }

      const record = value as Record<string, unknown>
      const typeValue = record['@type']
      if (typeof typeValue === 'string') {
        collected.push(typeValue)
      } else if (Array.isArray(typeValue)) {
        typeValue.forEach(item => {
          if (typeof item === 'string') {
            collected.push(item)
          }
        })
      }

      Object.values(record).forEach(visitValue)
    }

    try {
      visitValue(JSON.parse(raw))
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  })

  return dedupeStrings(collected, 8)
}

async function callGroqCompletion(
  system: string,
  user: string,
  maxTokens: number,
  temperature = 0.2
): Promise<{ content: string; provider: string }> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('Groq AI is not configured for live business generation')
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(45000),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    const errorMessage = `Groq request failed (${response.status})${errorBody ? `: ${errorBody.slice(0, 240)}` : ''}`
    if (response.status === 429) {
      throw new GroqRateLimitError(errorMessage, parseGroqRetryAfterSeconds(errorBody))
    }
    throw new Error(errorMessage)
  }

  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Groq returned an empty completion')
  }

  return {
    content,
    provider: 'groq-llama-3.3-70b-versatile',
  }
}

type ModulePromptBlueprint = {
  maxTokens: number
  moduleGuide: string
  jsonGuide: string
}

function truncateForPrompt(value: string, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return ''
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized
}

function buildResearchContextBlock(request: ResearchRequestPayload, websiteSignals: string) {
  const lines = [
    request.profile.businessName ? `User business: ${truncateForPrompt(request.profile.businessName, 90)}` : '',
    request.profile.oneLineDescription ? `User business description: ${truncateForPrompt(request.profile.oneLineDescription, 180)}` : '',
    request.profile.industry || request.profile.subIndustry
      ? `Industry: ${truncateForPrompt([request.profile.industry, request.profile.subIndustry].filter(Boolean).join(' / '), 120)}`
      : '',
    `Business model: ${request.profile.businessModelType}`,
    request.profile.primaryGeographies.length > 0
      ? `Geographies: ${truncateForPrompt(request.profile.primaryGeographies.join(', '), 140)}`
      : '',
    `Stage: ${request.profile.companyStage}`,
    `MSME registered: ${request.profile.isMsmeRegistered ? 'Yes' : 'No'}`,
    `Research intent: ${request.intent.intentType}`,
    `Target: ${truncateForPrompt(request.intent.targetName, 140)}`,
    request.intent.targetUrl ? `Target URL: ${truncateForPrompt(request.intent.targetUrl, 180)}` : '',
    request.intent.notes ? `Notes: ${truncateForPrompt(request.intent.notes, 260)}` : '',
    websiteSignals ? `Website signals: ${truncateForPrompt(websiteSignals, 320)}` : '',
  ].filter(Boolean)

  return lines.join('\n')
}

const MODULE_PROMPT_BLUEPRINTS: Record<ResearchModuleId, ModulePromptBlueprint> = {
  business_profile: {
    maxTokens: 700,
    moduleGuide: 'Focus on business clarity, segment fit, offer articulation, and operating maturity. Prefer concise evidence-backed descriptors over speculative market sizing.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "chips": [{ "label": string, "tone": tone }]
- "metricCards": [{ "label": string, "value": string, "detail"?: string, "tone"?: tone }]
- "progressMeters": [{ "label": string, "value": integer, "minLabel"?: string, "maxLabel"?: string, "detail"?: string, "tone"?: tone }]
- "donutCharts": [{ "title": string, "data": [{ "name": string, "value": integer, "color"?: "#hex" }] }]
- "listSections": [{ "title": string, "items": [{ "title": string, "description": string, "tone"?: tone }] }]
- "callout": { "title": string, "body": string, "tone"?: tone }`,
  },
  competitor_intelligence: {
    maxTokens: 850,
    moduleGuide: 'Only name competitors if directly supportable from supplied target signals or stable category knowledge. If evidence is thin, describe competitive patterns rather than inventing named firms.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "chips"
- "tables": [{ "title": string, "columns": [{ "key": string, "label": string }], "rows": [{ "id": string, "cells": { "columnKey": { "value": string, "tone"?: tone } } }] }]
- "scatterPlots": [{ "title": string, "xLabel": string, "yLabel": string, "data": [{ "name": string, "x": number, "y": number, "z": number, "detail"?: string, "tone"?: tone, "highlight"?: boolean }] }]
- "cardGroups": [{ "title": string, "columns"?: integer, "cards": [{ "title": string, "subtitle"?: string, "body"?: string, "badges"?: [{ "label": string, "tone"?: tone }], "details"?: [{ "label": string, "value": string }] }] }]
- "callout"`,
  },
  market_sizing: {
    maxTokens: 760,
    moduleGuide: 'Use market-size figures only when defensible. If hard numbers are not supportable, prefer qualitative structure and evidence-gap notes instead of fake TAM/SAM/SOM math.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "metricCards"
- "progressMeters"
- "nestedRings": { "title": string, "rings": [{ "label": string, "value": string, "share": integer, "growth"?: string }], "footer"?: string }
- "barCharts"
- "listSections"
- "callout"`,
  },
  future_growth: {
    maxTokens: 820,
    moduleGuide: 'Frame 1, 3, and 5-year direction with explicit uncertainty. Use scenario thinking and catalysts only when grounded in category signals.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "metricCards"
- "progressMeters"
- "lineCharts": [{ "title": string, "yLabel": string, "series": [{ "name": string, "color"?: "#hex", "points": [{ "x": string, "y": number, "low"?: number, "high"?: number }] }] }]
- "cardGroups"
- "listSections"
- "callout"`,
  },
  swot_analysis: {
    maxTokens: 700,
    moduleGuide: 'Deliver detailed SWOT points that are specific to the target and user-business context. Avoid generic strategy clichés.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "quadrants": [{ "title": string, "tone"?: tone, "items": [{ "title": string, "description": string, "tone"?: tone }] }]
- "callout"`,
  },
  pestle_analysis: {
    maxTokens: 760,
    moduleGuide: 'Be India-aware where relevant. If legal or policy applicability is uncertain, say so plainly instead of overstating compliance conclusions.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "cardGroups"
- "radarCharts": [{ "title": string, "data": [{ "label": string, "value": integer }] }]
- "callout"`,
  },
  customer_personas: {
    maxTokens: 820,
    moduleGuide: 'Build only personas that are supportable from the context. Make them commercially useful, not theatrical.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "cardGroups"
- "tables"
- "callout"`,
  },
  pricing_intelligence: {
    maxTokens: 760,
    moduleGuide: 'Use pricing ladders and model distributions only when supportable. If direct pricing signals are sparse, describe pricing posture and sensitivity qualitatively.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "metricCards"
- "barCharts"
- "donutCharts"
- "scatterPlots"
- "callout"`,
  },
  technology_landscape: {
    maxTokens: 760,
    moduleGuide: 'Focus on adoption signals, operating implications, and disruption risk. Do not overstate emerging-tech certainty.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "metricCards"
- "barCharts"
- "radarCharts"
- "listSections"
- "callout"`,
  },
  go_to_market: {
    maxTokens: 780,
    moduleGuide: 'Recommend channels, motion, and sequence with execution realism. Favor clear operator actions over abstract marketing language.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "barCharts"
- "timelines": [{ "title": string, "items": [{ "label": string, "start": string, "end"?: string, "detail"?: string, "tone"?: tone }] }]
- "listSections"
- "callout"`,
  },
  funding_landscape: {
    maxTokens: 720,
    moduleGuide: 'Only reference funding climate and investor appetite where it is defensible. Avoid fabricated rounds, valuations, or named investors.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "metricCards"
- "barCharts"
- "donutCharts"
- "listSections"
- "callout"`,
  },
  risk_matrix: {
    maxTokens: 760,
    moduleGuide: 'Prioritize concrete business risks, their severity, and mitigation. Make the matrix operational rather than academic.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "heatmaps": [{ "title": string, "items": [{ "label": string, "impact": integer, "probability": integer, "detail"?: string, "tone"?: tone }] }]
- "cardGroups"
- "callout"`,
  },
  industry_benchmarking: {
    maxTokens: 740,
    moduleGuide: 'Only use benchmark ranges when defensible. If benchmark evidence is thin, explain which metrics should be benchmarked and why.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "metricCards"
- "tables"
- "radarCharts"
- "callout"`,
  },
  regulatory_landscape: {
    maxTokens: 820,
    moduleGuide: 'Map applicable compliance and government-scheme implications conservatively. Never invent licences, regulators, or obligations.',
    jsonGuide: `Required keys:
- "summary": string
- "score": integer 1-100
Optional keys:
- "metricCards"
- "listSections"
- "cardGroups"
- "callout"`,
  },
}

function buildModulePrompt(moduleId: ResearchModuleId, request: ResearchRequestPayload, websiteSignals: string) {
  const moduleMeta = getResearchModuleById(moduleId)
  const blueprint = MODULE_PROMPT_BLUEPRINTS[moduleId]
  const contextBlock = buildResearchContextBlock(request, websiteSignals)

  return {
    system: `You are LevitateOS, a senior Indian market intelligence analyst preparing client-facing research deliverables for paid businesses.

Rules:
- Output only valid JSON with double-quoted keys and no markdown fences.
- Use specific, professional language that reads like a real analyst note, not AI filler.
- Personalize findings relative to the user's business context when provided.
- Prefer India-aware commercial framing and realistic operator language.
- If a conclusion is inferred rather than directly evidenced, state that explicitly inside the text.
- Do not fabricate competitor identities, funding rounds, legal requirements, market sizes, benchmark values, revenue figures, or statistics.
- Never use placeholder entities such as "Company A", "Company B", "Example competitor", or similar filler labels.
- Only include quantitative structures when they are genuinely supportable. Otherwise omit them and explain the evidence gap plainly.
- Use only these tone values when needed: gold, blue, green, red, orange, neutral.
- Keep numeric outputs as plain integers where possible.
- Return the smallest complete JSON object that still produces a strong dashboard section.

${blueprint.moduleGuide}`,
    user: `${contextBlock}

Generate the "${moduleMeta.title}" module for ${request.intent.targetName}.

Return one JSON object only.

Required response contract:
${blueprint.jsonGuide}

Important:
- "summary" and "score" are mandatory.
- Omit any optional key you cannot fill credibly.
- Keep collections tight and high-signal, usually 3 to 6 items.
- If evidence is thin, prefer text-based sections over charts and tables.`,
    maxTokens: blueprint.maxTokens,
  }
}

async function collectWebsiteSignals(targetUrl: string, targetName = '') {
  const normalizedTargetUrl = normalizeTargetUrl(targetUrl)
  const cacheKey = `${normalizedTargetUrl}|${targetName.trim().toLowerCase()}`
  const cached = WEBSITE_SIGNAL_CACHE.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  if (!normalizedTargetUrl && !targetName.trim()) {
    return ''
  }

  const signalLines: string[] = []

  try {
    if (normalizedTargetUrl) {
      const response = await fetch(normalizedTargetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const html = await response.text()
        const page = load(html)
        const resolvedUrl = response.url || normalizedTargetUrl
        const hostLabel = getHostLabel(resolvedUrl)
        const title = truncateSignalValue(
          page('meta[property="og:title"]').attr('content')?.trim() || page('title').text().trim(),
          140
        )
        const description = truncateSignalValue(
          page('meta[name="description"]').attr('content')?.trim() ||
            page('meta[property="og:description"]').attr('content')?.trim() ||
            '',
          220
        )
        const headings = dedupeStrings(
          page('h1, h2')
            .slice(0, 8)
            .map((_, node) => page(node).text())
            .get(),
          6
        )
        const bodySignals = dedupeStrings(
          page('main p, article p, section p, p')
            .slice(0, 10)
            .map((_, node) => page(node).text())
            .get()
            .filter(text => text.trim().length >= 55)
            .map(text => truncateSignalValue(text, 180)),
          3
        )
        const ctas = dedupeStrings(
          page('a, button')
            .slice(0, 80)
            .map((_, node) => page(node).text())
            .get()
            .filter(text => /(book|contact|schedule|demo|get started|talk|start|request|pricing|plans|consult|apply|join|trial)/i.test(text))
            .map(text => truncateSignalValue(text, 50)),
          6
        )
        const internalLinks = dedupeStrings(
          page('a[href]')
            .slice(0, 120)
            .map((_, node) => {
              const href = page(node).attr('href')?.trim() ?? ''
              const text = truncateSignalValue(page(node).text(), 40)
              if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
                return ''
              }

              const absolute = resolveHref(resolvedUrl, href)
              if (!absolute || getHostLabel(absolute) !== hostLabel || !text) {
                return ''
              }

              return `${text} (${new URL(absolute).pathname || '/'})`
            })
            .get(),
          6
        )
        const socialProfiles = dedupeStrings(
          page('a[href]')
            .slice(0, 120)
            .map((_, node) => page(node).attr('href')?.trim() ?? '')
            .get()
            .filter(href => /(linkedin\.com|twitter\.com|x\.com|instagram\.com|youtube\.com|github\.com)/i.test(href))
            .map(href => truncateSignalValue(href, 80)),
          5
        )
        const schemaTypes = collectSchemaTypes(page)
        const observedTooling = dedupeStrings(
          [
            html.includes('wp-content') ? 'WordPress' : '',
            html.includes('cdn.shopify.com') ? 'Shopify' : '',
            html.includes('webflow') ? 'Webflow' : '',
            html.includes('gtag(') || html.includes('googletagmanager') ? 'Google Tag Manager / Analytics' : '',
            html.includes('hubspot') ? 'HubSpot' : '',
            html.includes('intercom') ? 'Intercom' : '',
            html.includes('segment.com') ? 'Segment' : '',
          ],
          6
        )

        signalLines.push(
          hostLabel ? `Website host: ${hostLabel}` : '',
          title ? `Website title: ${title}` : '',
          description ? `Website description: ${description}` : '',
          headings.length > 0 ? `Primary headings: ${headings.join(' | ')}` : '',
          bodySignals.length > 0 ? `Visible page copy: ${bodySignals.join(' | ')}` : '',
          ctas.length > 0 ? `Observed calls to action: ${ctas.join(' | ')}` : '',
          internalLinks.length > 0 ? `Internal navigation: ${internalLinks.join(' | ')}` : '',
          socialProfiles.length > 0 ? `Social profiles: ${socialProfiles.join(' | ')}` : '',
          schemaTypes.length > 0 ? `Schema types: ${schemaTypes.join(', ')}` : '',
          observedTooling.length > 0 ? `Observed website tooling: ${observedTooling.join(', ')}` : ''
        )
      }
    }
  } catch {
    // Ignore target-site fetch failures and continue with search signals.
  }

  if (targetName.trim()) {
    try {
      const hostLabel = getHostLabel(normalizedTargetUrl)
      const query = hostLabel ? `${targetName} ${hostLabel}` : targetName
      const searchResults = await searchDuckDuckGo(query, {
        safeSearch: SafeSearchType.MODERATE,
        locale: 'en-us',
        region: 'in-en',
      })

      const relevantResults = searchResults.results
        .filter(result => {
          const title = result.title.toLowerCase()
          const description = result.description.toLowerCase()
          const hostname = result.hostname.toLowerCase()
          const normalizedTarget = targetName.trim().toLowerCase()

          return (hostLabel ? hostname.includes(hostLabel) : false) ||
            title.includes(normalizedTarget) ||
            description.includes(normalizedTarget)
        })
        .slice(0, 5)
        .map(result => `${truncateSignalValue(result.title, 90)} (${result.hostname})`)

      if (relevantResults.length > 0) {
        signalLines.push(`Search visibility: ${relevantResults.join(' | ')}`)
      }
    } catch {
      // Ignore search-source failures.
    }
  }

  const value = signalLines.filter(Boolean).join('\n')
  WEBSITE_SIGNAL_CACHE.set(cacheKey, {
    value,
    expiresAt: Date.now() + 30 * 60 * 1000,
  })

  return value
}

function buildMetricCards(items: Array<[string, string, string?, MetricCard['tone']?]>): MetricCard[] {
  return items.map(([label, value, detail, tone]) => ({ label, value, detail, tone }))
}

function buildProgressMeters(items: Array<[string, number, string, string, string?, ProgressMeter['tone']?]>): ProgressMeter[] {
  return items.map(([label, value, minLabel, maxLabel, detail, tone]) => ({
    label,
    value,
    minLabel,
    maxLabel,
    detail,
    tone,
  }))
}

function fallbackModulePayload(moduleId: ResearchModuleId, request: ResearchRequestPayload): ResearchModulePayload {
  const baseSeed = hashString(`${request.profile.businessName}|${request.intent.targetName}|${moduleId}`)
  const businessName = request.profile.businessName || 'Your business'
  const targetName = request.intent.targetName || 'Target business'
  const industry = request.profile.industry || 'Business services'
  const primaryGeo = request.profile.primaryGeographies[0] || 'India'
  const opportunityScore = clamp(55 + (baseSeed % 28), 42, 92)
  const clarityScore = clamp(50 + (baseSeed % 30), 35, 90)
  const maturityScore = clamp(38 + (baseSeed % 40), 20, 88)
  const pricingScore = clamp(52 + (baseSeed % 34), 40, 90)
  const disruptionScore = clamp(44 + (baseSeed % 42), 20, 95)
  const riskBias = baseSeed % 5

  const competitorNames = [
    `${targetName} Prime`,
    `${targetName} Plus`,
    `${industry.split(' ')[0]} Nexus`,
    `${industry.split(' ')[0]} Works`,
    `${targetName} Edge`,
    `${primaryGeo.split(' ')[0]} Benchmark`,
  ]

  switch (moduleId) {
    case 'business_profile':
      return {
        summary: `${targetName} appears to compete on clarity of offer, segment focus, and reachable distribution in ${primaryGeo}. Relative to ${businessName}, the clearest upside is sharper differentiation around execution speed and trust.`,
        score: clarityScore,
        chips: [
          { label: industry, tone: 'gold' },
          { label: request.profile.businessModelType, tone: 'blue' },
          { label: primaryGeo, tone: 'green' },
        ],
        metricCards: buildMetricCards([
          ['Core offer', 'Problem solving operator', 'Focused on solving a narrow, high-friction workflow', 'gold'],
          ['Revenue model', request.profile.businessModelType, 'Primary monetization follows the dominant business model', 'blue'],
          ['Growth stage', request.profile.companyStage.replace(/_/g, ' '), 'Signals suggest an early-to-growth operating cadence', 'green'],
        ]),
        progressMeters: buildProgressMeters([
          ['Business Maturity Meter', maturityScore, 'Idea', 'Dominant', 'Current position inferred from clarity, reach, and system maturity', 'gold'],
          ['Value Proposition Clarity', clarityScore, '0', '100', 'Differentiation is strongest when trust and execution speed are emphasized', 'gold'],
        ]),
        donutCharts: [
          {
            title: 'Customer Segment Breakdown',
            data: [
              { name: 'SMBs', value: 44, color: '#c8a96e' },
              { name: 'Mid-market', value: 31, color: '#6f9cd7' },
              { name: 'Enterprise', value: 25, color: '#62b38b' },
            ],
          },
        ],
        listSections: [
          {
            title: 'Profile Highlights',
            items: [
              { title: 'Primary segment', description: `The strongest fit appears to be operators in ${primaryGeo} looking for a faster, lower-friction alternative.`, tone: 'gold' },
              { title: 'Secondary segment', description: 'A second layer of demand comes from buyers who need stronger implementation support and handholding.', tone: 'blue' },
              { title: 'Operating edge', description: `${businessName} can frame execution reliability and measurable outcomes more sharply than a generic category pitch.`, tone: 'green' },
            ],
          },
        ],
        callout: {
          title: 'Differentiation leverage',
          body: `Lead with a sharper promise around response speed, implementation certainty, and India-specific execution depth to make ${businessName} stand out faster.`,
          tone: 'gold',
        },
      }
    case 'competitor_intelligence': {
      const columns: TableColumn[] = [
        { key: 'name', label: 'Competitor' },
        { key: 'product', label: 'Core Product' },
        { key: 'pricing', label: 'Pricing' },
        { key: 'brand', label: 'Brand' },
        { key: 'support', label: 'Support' },
        { key: 'digital', label: 'Digital Presence' },
        { key: 'reach', label: 'Geographic Reach' },
        { key: 'innovation', label: 'Innovation Rate' },
        { key: 'switching', label: 'Ease of Switching' },
        { key: 'partners', label: 'Partnerships' },
        { key: 'seo', label: 'Content & SEO' },
        { key: 'mobile', label: 'Mobile Experience' },
        { key: 'enterprise', label: 'Enterprise Ready' },
        { key: 'delivery', label: 'Speed' },
        { key: 'threat', label: 'Threat' },
      ]

      const rows: TableRow[] = competitorNames.map((name, index) => {
        const threat = clamp(5 + ((baseSeed + index * 7) % 5), 1, 10)
        const tone: TableCell['tone'] = threat >= 8 ? 'gold' : threat >= 6 ? 'neutral' : 'red'
        return {
          id: name,
          cells: {
            name: asCell(name),
            product: asCell(threat + 1, tone),
            pricing: asCell(index % 3 === 0 ? 'Premium' : index % 2 === 0 ? 'Mid' : 'Budget', tone),
            brand: asCell(50 + index * 6, tone),
            support: asCell(48 + index * 5, index % 2 === 0 ? 'gold' : 'neutral'),
            digital: asCell(52 + index * 5, tone),
            reach: asCell(index < 2 ? 'National' : 'Regional', index < 2 ? 'gold' : 'neutral'),
            innovation: asCell(45 + index * 6, tone),
            switching: asCell(55 - index * 4, 'neutral'),
            partners: asCell(40 + index * 7, tone),
            seo: asCell(44 + index * 6, tone),
            mobile: asCell(46 + index * 5, tone),
            enterprise: asCell(38 + index * 6, tone),
            delivery: asCell(index < 3 ? 'Fast' : 'Moderate', index < 3 ? 'gold' : 'neutral'),
            threat: asCell(`${threat}/10`, tone),
          },
        }
      })

      return {
        summary: `The competitive field around ${targetName} is crowded by a few stronger digital brands and a wider tail of regional operators. The most credible threat comes from firms that combine broad reach with premium positioning rather than from low-cost players alone.`,
        score: clamp(60 + (baseSeed % 24), 48, 89),
        tables: [
          {
            title: 'Competitor Comparison Matrix',
            columns,
            rows,
          },
        ],
        scatterPlots: [
          {
            title: 'Competitive Positioning Scatter Plot',
            xLabel: 'Price',
            yLabel: 'Product Breadth',
            data: competitorNames.map((name, index) => ({
              name,
              x: 30 + index * 10,
              y: 42 + index * 7,
              z: 18 + index * 6,
              tone: index === 0 ? 'gold' : 'blue',
              detail: `${index < 2 ? 'Direct' : 'Indirect'} competitor`,
              highlight: index === 0,
            })),
          },
        ],
        cardGroups: [
          {
            title: 'Competitor Cards',
            columns: 2,
            cards: competitorNames.slice(0, 6).map((name, index) => ({
              title: name,
              subtitle: index % 2 === 0 ? 'Premium positioning' : 'Mid-market positioning',
              body: `${name} leans on clearer messaging, repeatable acquisition, and stronger digital trust than the average category player.`,
              badges: [
                { label: `Threat ${clamp(5 + ((baseSeed + index) % 5), 1, 10)}/10`, tone: index < 2 ? 'gold' : 'neutral' },
              ],
              details: [
                { label: 'Strengths', value: 'Distribution, trust, pricing architecture' },
                { label: 'Weaknesses', value: 'Switching friction and slower customization' },
              ],
            })),
          },
        ],
      }
    }
    case 'market_sizing':
      return {
        summary: `The addressable opportunity around ${targetName} is large enough to support focused niche capture, but serviceable growth will depend on segment selection and distribution reach. The strongest near-term opportunity sits in a sharply defined sub-segment rather than the full TAM.`,
        score: clamp(58 + (baseSeed % 22), 45, 90),
        nestedRings: {
          title: 'TAM / SAM / SOM',
          rings: [
            { label: 'TAM', value: 'Rs. 1,250 Cr / $150M', share: 100, growth: '13% YoY' },
            { label: 'SAM', value: 'Rs. 410 Cr / $49M', share: 33, growth: '16% YoY' },
            { label: 'SOM', value: 'Rs. 68 Cr / $8M', share: 5, growth: '22% YoY' },
          ],
          footer: 'Figures are directional intelligence estimates, not audited market data.',
        },
        progressMeters: buildProgressMeters([
          ['Market Concentration Index', 46, 'Fragmented', 'Dominated', 'The space looks moderately fragmented with room for focused challengers.', 'blue'],
          ['Market Maturity', 54, 'Emerging', 'Declining', 'The category appears to be in a growth-to-maturing phase.', 'gold'],
        ]),
        barCharts: [
          {
            title: 'Segment Opportunity Mix',
            orientation: 'horizontal',
            data: [
              { label: 'Urban SMB', value: 42, tone: 'gold' },
              { label: 'Mid-market', value: 33, tone: 'blue' },
              { label: 'Enterprise', value: 25, tone: 'green' },
            ],
          },
        ],
      }
    case 'future_growth':
      return {
        summary: `Growth outlook remains constructive over 1, 3, and 5-year horizons, especially if adoption tailwinds in ${primaryGeo} stay firm. Execution quality and regulatory clarity will be the biggest variables separating the base case from the upside.`,
        score: opportunityScore,
        lineCharts: [
          {
            title: 'Growth Forecast',
            yLabel: 'Market opportunity',
            series: [
              {
                name: 'Optimistic',
                color: '#c8a96e',
                points: [
                  { x: 'Year 1', y: 68, low: 60, high: 75 },
                  { x: 'Year 3', y: 88, low: 80, high: 96 },
                  { x: 'Year 5', y: 108, low: 100, high: 118 },
                ],
              },
              {
                name: 'Base case',
                color: '#6f9cd7',
                points: [
                  { x: 'Year 1', y: 60, low: 54, high: 67 },
                  { x: 'Year 3', y: 76, low: 70, high: 82 },
                  { x: 'Year 5', y: 93, low: 86, high: 100 },
                ],
              },
              {
                name: 'Pessimistic',
                color: '#b16a52',
                points: [
                  { x: 'Year 1', y: 52, low: 48, high: 56 },
                  { x: 'Year 3', y: 60, low: 55, high: 65 },
                  { x: 'Year 5', y: 69, low: 64, high: 74 },
                ],
              },
            ],
          },
        ],
        progressMeters: buildProgressMeters([
          ['Growth Opportunity Score', opportunityScore, '1', '100', 'Weighted by demand, adoption, competition, and timing.', 'gold'],
        ]),
        cardGroups: [
          {
            title: 'Growth Catalysts',
            columns: 3,
            cards: [
              { title: 'India demand tailwind', body: 'Faster digital adoption and operational pressure continue to expand category readiness.', tone: 'gold' },
              { title: 'Channel leverage', body: 'Partnership-led reach can compress go-to-market cost for focused operators.', tone: 'green' },
              { title: 'Execution gap', body: 'Incumbents often leave room for a more responsive, better-documented buyer experience.', tone: 'blue' },
            ],
          },
          {
            title: 'Growth Risks',
            columns: 3,
            cards: [
              { title: 'Regulatory drag', body: 'Compliance changes can slow expansion or alter customer acquisition economics.', tone: 'red' },
              { title: 'Pricing compression', body: 'Aggressive discounting from broad players can reset willingness to pay.', tone: 'orange' },
              { title: 'Trust barriers', body: 'B2B buyers may demand proof, references, and clearer implementation guarantees.', tone: 'red' },
            ],
          },
        ],
      }
    case 'swot_analysis': {
      const buildSix = (prefix: string, tone: Chip['tone']) =>
        Array.from({ length: 6 }).map((_, index) => ({
          title: `${prefix} ${index + 1}`,
          description: `${prefix} insight ${index + 1} for ${targetName} viewed through the lens of ${businessName} and ${primaryGeo}.`,
          tone,
        }))

      return {
        summary: `The SWOT picture suggests the best near-term move is to sharpen one narrow wedge where ${businessName} can win on speed, proof, and relevance instead of breadth alone.`,
        score: clamp(61 + (baseSeed % 18), 48, 90),
        quadrants: [
          { title: 'Strengths', tone: 'gold', items: buildSix('Strength', 'gold') },
          { title: 'Weaknesses', tone: 'red', items: buildSix('Weakness', 'red') },
          { title: 'Opportunities', tone: 'green', items: buildSix('Opportunity', 'green') },
          { title: 'Threats', tone: 'orange', items: buildSix('Threat', 'orange') },
        ],
        callout: {
          title: 'Strategic Priority',
          body: `Own a clearer category promise around outcome speed and trust so ${businessName} wins the first shortlist conversation more often.`,
          tone: 'gold',
        },
      }
    }
    case 'pestle_analysis':
      return {
        summary: `${targetName} is most sensitive to legal, economic, and technology shifts in India. The best operating stance is to stay proactive on compliance while using digital adoption tailwinds to compound distribution.`,
        score: clamp(59 + (baseSeed % 19), 46, 88),
        cardGroups: [
          {
            title: 'PESTLE Factors',
            columns: 3,
            cards: [
              { title: 'Political', body: 'Policy execution, state-level incentives, and procurement behavior influence category timing.', details: [{ label: 'Impact', value: '3 / 5' }], tone: 'neutral' },
              { title: 'Economic', body: 'Cost pressure and buyer caution increase ROI scrutiny but can also accelerate adoption.', details: [{ label: 'Impact', value: '4 / 5' }], tone: 'gold' },
              { title: 'Social', body: 'Trust, local references, and implementation confidence shape final purchase decisions.', details: [{ label: 'Impact', value: '3 / 5' }], tone: 'blue' },
              { title: 'Technological', body: 'AI, automation, and cloud tooling continue to raise buyer expectations across the market.', details: [{ label: 'Impact', value: '5 / 5' }], tone: 'green' },
              { title: 'Legal', body: 'DPDP, contract enforcement, licensing, and sector rules materially affect operating risk.', details: [{ label: 'Impact', value: '5 / 5' }], tone: 'red' },
              { title: 'Environmental', body: 'Procurement and brand positioning may increasingly reward sustainable operating claims.', details: [{ label: 'Impact', value: '2 / 5' }], tone: 'neutral' },
            ],
          },
        ],
        radarCharts: [
          {
            title: 'PESTLE Radar',
            data: [
              { label: 'Political', value: 58 },
              { label: 'Economic', value: 74 },
              { label: 'Social', value: 61 },
              { label: 'Technological', value: 82 },
              { label: 'Legal', value: 80 },
              { label: 'Environmental', value: 34 },
            ],
          },
        ],
      }
    case 'customer_personas':
      return {
        summary: `Demand clusters around three buyer archetypes: the efficiency-seeking operator, the cautious decision-maker, and the scale-focused team lead. Their objections differ, but all three care about trust, clarity, and implementation certainty.`,
        score: clamp(63 + (baseSeed % 18), 49, 91),
        cardGroups: [
          {
            title: 'Primary Personas',
            columns: 3,
            cards: [
              {
                title: 'Aarav - Efficiency Operator',
                subtitle: '30 to 40 years • Urban SMB',
                body: 'Wants systems that save time, reduce coordination overhead, and improve visibility without adding management drag.',
                badges: [{ label: 'Current alternative: spreadsheets', tone: 'red' }],
                details: [
                  { label: 'Pain points', value: 'Fragmented follow-up, weak reporting, slow execution' },
                  { label: 'Goals', value: 'Faster revenue visibility and cleaner team workflows' },
                ],
              },
              {
                title: 'Mira - Trust-Led Buyer',
                subtitle: '35 to 48 years • Service business owner',
                body: 'Needs stronger confidence, references, and clarity before committing budget to a new operating layer.',
                badges: [{ label: 'Current alternative: local agency', tone: 'neutral' }],
                details: [
                  { label: 'Pain points', value: 'Vendor inconsistency, poor support, vague promises' },
                  { label: 'Goals', value: 'Predictable implementation with accountable support' },
                ],
              },
              {
                title: 'Rohan - Scale Lead',
                subtitle: '28 to 42 years • Growth team',
                body: 'Looks for systems that can support larger distribution motion, clearer ownership, and measurable ROI.',
                badges: [{ label: 'Current alternative: stitched tools', tone: 'blue' }],
                details: [
                  { label: 'Pain points', value: 'Tool sprawl, weak reporting, poor handoffs' },
                  { label: 'Goals', value: 'Scalable operating cadence and stronger forecasting' },
                ],
              },
            ],
          },
        ],
        tables: [
          {
            title: 'Persona Comparison Matrix',
            columns: [
              { key: 'persona', label: 'Persona' },
              { key: 'goal', label: 'Top Goal' },
              { key: 'pain', label: 'Top Pain' },
              { key: 'channel', label: 'Discovery Channel' },
              { key: 'objection', label: 'Main Objection' },
            ],
            rows: [
              {
                id: 'aarav',
                cells: {
                  persona: asCell('Aarav'),
                  goal: asCell('Operational efficiency'),
                  pain: asCell('Fragmented follow-up'),
                  channel: asCell('Search and referrals'),
                  objection: asCell('Migration effort'),
                },
              },
              {
                id: 'mira',
                cells: {
                  persona: asCell('Mira'),
                  goal: asCell('Vendor trust'),
                  pain: asCell('Inconsistent support'),
                  channel: asCell('Referrals and case studies'),
                  objection: asCell('Proof and credibility'),
                },
              },
              {
                id: 'rohan',
                cells: {
                  persona: asCell('Rohan'),
                  goal: asCell('Scalable revenue motion'),
                  pain: asCell('Tool sprawl'),
                  channel: asCell('Content and peers'),
                  objection: asCell('Integration complexity'),
                },
              },
            ],
          },
        ],
      }
    case 'pricing_intelligence':
      return {
        summary: `Pricing intelligence suggests the cleanest opportunity is in a well-explained mid-market package that feels premium in outcomes but not enterprise-heavy in process. The strongest pricing gap is often in transparent onboarding plus visible value milestones.`,
        score: pricingScore,
        barCharts: [
          {
            title: 'Pricing Landscape',
            data: competitorNames.slice(0, 5).map((name, index) => ({
              label: name,
              value: 25 + index * 12,
              detail: index < 2 ? 'Premium' : index === 2 ? 'Mid-market' : 'Budget',
              tone: index < 2 ? 'gold' : index === 2 ? 'blue' : 'neutral',
            })),
          },
        ],
        donutCharts: [
          {
            title: 'Pricing Model Distribution',
            data: [
              { name: 'Subscription', value: 37, color: '#c8a96e' },
              { name: 'Tiered', value: 24, color: '#6f9cd7' },
              { name: 'Project-based', value: 21, color: '#62b38b' },
              { name: 'Usage-based', value: 18, color: '#b16a52' },
            ],
          },
        ],
        scatterPlots: [
          {
            title: 'Price-to-Value',
            xLabel: 'Price',
            yLabel: 'Perceived value',
            data: competitorNames.slice(0, 5).map((name, index) => ({
              name,
              x: 28 + index * 12,
              y: 34 + index * 11,
              z: 16 + index * 5,
              tone: index === 1 ? 'gold' : 'blue',
              highlight: index === 1,
            })),
          },
        ],
        callout: {
          title: 'Pricing Strategy Recommendation',
          body: `Position ${businessName} in the upper mid-market with a transparent onboarding layer, a clear value narrative, and a visible path to premium upsell once proof is established.`,
          tone: 'gold',
        },
      }
    case 'technology_landscape':
      return {
        summary: `Technology adoption in ${industry} is moving beyond basic tooling into AI-assisted workflows, automation, and better reporting. The bigger risk is not lack of tooling but slower adoption and weaker change management.`,
        score: disruptionScore,
        barCharts: [
          {
            title: 'Technology Adoption Curve',
            orientation: 'horizontal',
            data: [
              { label: 'AI copilots', value: 76, tone: 'gold' },
              { label: 'Workflow automation', value: 68, tone: 'blue' },
              { label: 'Data platforms', value: 54, tone: 'green' },
              { label: 'Predictive analytics', value: 43, tone: 'neutral' },
              { label: 'Legacy stacks', value: 29, tone: 'red' },
            ],
          },
        ],
        cardGroups: [
          {
            title: 'Technology Radar',
            columns: 4,
            cards: [
              { title: 'Adopt', body: 'CRM automation, AI summaries, dashboard reporting', tone: 'green' },
              { title: 'Trial', body: 'Agent workflows, voice automation, lead scoring', tone: 'gold' },
              { title: 'Assess', body: 'Predictive pricing and advanced orchestration', tone: 'blue' },
              { title: 'Hold', body: 'High-complexity stack changes with low immediate ROI', tone: 'red' },
            ],
          },
        ],
        metricCards: buildMetricCards([
          ['Disruption Risk Score', `${disruptionScore}/100`, 'Higher risk means incumbents with weak adoption are more exposed.', 'gold'],
        ]),
      }
    case 'go_to_market':
      return {
        summary: `The best go-to-market path for ${businessName} is a tightly framed, proof-heavy motion that pairs search intent with referral leverage and selectively layered outbound. The positioning should emphasize trust, speed, and measurable business outcomes.`,
        score: clamp(61 + (baseSeed % 20), 49, 92),
        scatterPlots: [
          {
            title: 'Channel Priority Matrix',
            xLabel: 'Effort',
            yLabel: 'Effectiveness',
            data: [
              { name: 'SEO + content', x: 44, y: 78, z: 18, tone: 'gold', detail: 'High-leverage compounding channel' },
              { name: 'Referral engine', x: 30, y: 72, z: 16, tone: 'green', detail: 'Fast trust transfer' },
              { name: 'Outbound email', x: 58, y: 56, z: 14, tone: 'blue', detail: 'Works with strong targeting' },
              { name: 'Paid social', x: 66, y: 50, z: 13, tone: 'neutral', detail: 'Useful once messaging is sharper' },
            ],
          },
        ],
        timelines: [
          {
            title: 'Phased Launch Sequence',
            items: [
              { label: 'Month 1', start: 'Month 1', detail: 'Sharpen positioning, offer architecture, and case-study proof', tone: 'gold' },
              { label: 'Month 3', start: 'Month 3', detail: 'Layer SEO, referral loops, and high-intent outbound', tone: 'blue' },
              { label: 'Month 6', start: 'Month 6', detail: 'Operationalize repeatable acquisition and reporting cadence', tone: 'green' },
              { label: 'Month 12', start: 'Month 12', detail: 'Expand partnerships and selective premium packaging', tone: 'gold' },
            ],
          },
        ],
        callout: {
          title: 'Positioning Statement',
          body: `${businessName} helps ${industry.toLowerCase()} operators move faster with an India-aware, execution-first system that delivers clearer visibility, stronger follow-up, and lower operating drag.`,
          tone: 'gold',
        },
        metricCards: buildMetricCards([
          ['Sales motion', 'Hybrid product-led + consultative', 'Lead with clarity and proof, then support decision-making with hands-on guidance.', 'blue'],
        ]),
      }
    case 'funding_landscape':
      return {
        summary: `Investor appetite in the wider category remains selective but real. Capital is still available for businesses that can show disciplined growth, repeatable unit economics, and a differentiated wedge instead of undirected expansion.`,
        score: clamp(56 + (baseSeed % 22), 40, 88),
        barCharts: [
          {
            title: 'Funding Activity Timeline',
            data: [
              { label: '2021', value: 68, tone: 'gold' },
              { label: '2022', value: 61, tone: 'blue' },
              { label: '2023', value: 47, tone: 'neutral' },
              { label: '2024', value: 58, tone: 'green' },
              { label: '2025', value: 63, tone: 'gold' },
            ],
          },
        ],
        donutCharts: [
          {
            title: 'Investor Category Breakdown',
            data: [
              { name: 'Angels', value: 23, color: '#c8a96e' },
              { name: 'Micro-VC', value: 26, color: '#6f9cd7' },
              { name: 'Institutional VC', value: 29, color: '#62b38b' },
              { name: 'Strategic', value: 22, color: '#b16a52' },
            ],
          },
        ],
        metricCards: buildMetricCards([
          ['Fundability Score', `${clamp(50 + (baseSeed % 25), 35, 89)}/100`, 'Improves when positioning, retention, and repeatable acquisition become more visible.', 'gold'],
        ]),
      }
    case 'risk_matrix': {
      const heatmapItems: HeatmapItem[] = Array.from({ length: 12 }).map((_, index) => ({
        label: `Risk ${index + 1}`,
        impact: clamp(2 + ((baseSeed + index) % 4), 1, 5),
        probability: clamp(1 + ((baseSeed + index * 2 + riskBias) % 5), 1, 5),
        tone: index < 3 ? 'red' : index < 7 ? 'orange' : 'green',
        detail: `Mitigation should focus on early monitoring, decision ownership, and contingency response.`,
      }))

      return {
        summary: `${targetName} faces its highest exposure in regulatory clarity, acquisition efficiency, and execution consistency. Most critical risks can be softened by better visibility, clearer ownership, and stronger documentation.`,
        score: clamp(57 + (baseSeed % 18), 42, 86),
        heatmaps: [
          {
            title: 'Risk Matrix',
            items: heatmapItems,
          },
        ],
        cardGroups: [
          {
            title: 'Top Risk Cards',
            columns: 2,
            cards: heatmapItems.slice(0, 5).map((item, index) => ({
              title: item.label,
              subtitle: index < 2 ? 'Critical' : 'High',
              body: item.detail,
              tone: item.tone,
              details: [
                { label: 'Probability', value: `${item.probability}/5` },
                { label: 'Impact', value: `${item.impact}/5` },
              ],
            })),
          },
        ],
      }
    }
    case 'industry_benchmarking':
      return {
        summary: `Benchmarking suggests ${businessName} can outperform category averages on responsiveness and implementation support, but still needs stronger reporting discipline and clearer customer proof to consistently rank above benchmark.`,
        score: clamp(60 + (baseSeed % 21), 44, 89),
        metricCards: buildMetricCards([
          ['CAC norm', 'Rs. 9k to Rs. 18k', 'Current modeled position: at benchmark', 'neutral'],
          ['Gross margin norm', '48% to 66%', 'Current modeled position: above benchmark', 'gold'],
          ['Churn norm', '4% to 9%', 'Current modeled position: below benchmark visibility', 'red'],
          ['Revenue / employee', 'Rs. 10L to Rs. 24L', 'Current modeled position: near benchmark', 'blue'],
        ]),
        radarCharts: [
          {
            title: 'Benchmark Spider Chart',
            data: [
              { label: 'Growth', value: 68 },
              { label: 'Margin', value: 73 },
              { label: 'Retention', value: 54 },
              { label: 'Productivity', value: 61 },
              { label: 'Support', value: 77 },
              { label: 'Brand', value: 58 },
            ],
          },
        ],
      }
    case 'regulatory_landscape':
      return {
        summary: `Compliance exposure for ${targetName} is manageable but cannot be treated as background noise, especially if the business touches customer data, financial workflows, or sector-specific licensing. The most practical move is a prioritized checklist with deadlines and ownership.`,
        score: clamp(58 + (baseSeed % 20), 43, 87),
        listSections: [
          {
            title: 'Critical',
            items: [
              { title: 'GST and statutory filings', description: 'Confirm registration thresholds, filing cadence, and invoice hygiene.', tone: 'red' },
              { title: 'DPDP readiness', description: 'Map consent, notice, and data-handling obligations under the DPDP Act 2023.', tone: 'red' },
              { title: 'Sector licensing', description: 'Check regulator-specific approvals before widening market reach.', tone: 'red' },
            ],
          },
          {
            title: 'Important',
            items: [
              { title: 'Labour code alignment', description: 'Review employment documentation, payment structures, and contractor treatment.', tone: 'gold' },
              { title: 'MSME eligibility', description: 'Use registration strategically for procurement and delayed-payment enforcement benefits.', tone: 'gold' },
              { title: 'Contract hygiene', description: 'Refresh MSA, payment clauses, arbitration language, and limitation references.', tone: 'gold' },
            ],
          },
          {
            title: 'Advisory',
            items: [
              { title: 'PLI and incentives', description: 'Check whether state or central incentives improve capex economics.', tone: 'neutral' },
              { title: 'Environmental approvals', description: 'Validate only if operations touch manufacturing, waste, or location-specific clearances.', tone: 'neutral' },
            ],
          },
        ],
        progressMeters: buildProgressMeters([
          ['Regulatory Risk Score', clamp(48 + (baseSeed % 28), 32, 90), 'Low', 'High', 'A higher score means more active legal and compliance management is required.', 'gold'],
        ]),
        cardGroups: [
          {
            title: 'Government Schemes and Incentives',
            columns: 3,
            cards: [
              { title: 'MSME support stack', body: 'Useful for collateral-free lending, receivables leverage, and delayed-payment protection.', tone: 'gold' },
              { title: 'Digital adoption incentives', body: 'Relevant where workflow digitization or cloud tooling improves formalization.', tone: 'blue' },
              { title: 'State-level industrial support', body: 'Manufacturing and scale-up operations should examine local subsidy structures.', tone: 'green' },
            ],
          },
        ],
      }
    default:
      return {
        summary: `Directional intelligence for ${targetName} is ready.`,
        score: 60,
      }
  }
}

void fallbackModulePayload

const PLACEHOLDER_PAYLOAD_PATTERNS = [
  /\bcompany a\b/i,
  /\bcompany b\b/i,
  /\bexample competitor\b/i,
  /\bplaceholder\b/i,
  /\bsample company\b/i,
  /\btbd\b/i,
]

function normalizePayload(value: unknown, targetName?: string): ResearchModulePayload | null {
  return normalizeResearchModulePayload(value, targetName)
}

function containsPlaceholderPayload(value: ResearchModulePayload, targetName?: string) {
  const serialized = JSON.stringify(value)
  const targetPattern = targetName
    ? new RegExp(`\\b${targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(?:prime|plus|edge|nexus|works|benchmark)\\b`, 'i')
    : null
  return PLACEHOLDER_PAYLOAD_PATTERNS.some((pattern) => pattern.test(serialized)) || Boolean(targetPattern?.test(serialized))
}

export async function getBusinessApiContext(requiredFeature?: PortalFeatureKey): Promise<BusinessApiContext> {
  const cookieStore = await cookies()
  const authSupabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Read-only session in route handlers.
        },
      },
    }
  )

  const {
    data: { user },
  } = await authSupabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { portal } = await getBusinessPortalState()
  if (!portal.hasPaidAccess) {
    throw new Error('Active subscription required')
  }

  if (requiredFeature && !portal.featureAccess[requiredFeature]) {
    throw new Error('This feature is not enabled for the active plan')
  }

  return {
    userId: user.id,
    accountEmail: user.email?.toLowerCase() ?? null,
    portal,
  }
}

export async function getResearchQuota(userId: string, timeZone: string) {
  const supabase = getServiceSupabase()
  const dayRange = getCalendarDayRange(timeZone)
  const { count } = await supabase
    .from('business_research_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('attempt_status', ['reserved', 'completed', 'partial', 'failed'])
    .gte('created_at', dayRange.start.toISOString())
    .lte('created_at', dayRange.end.toISOString())

  const used = count ?? 0
  return {
    used,
    remaining: Math.max(RESEARCH_DAILY_LIMIT - used, 0),
    limit: RESEARCH_DAILY_LIMIT,
    startIso: dayRange.start.toISOString(),
    endIso: dayRange.end.toISOString(),
  }
}

export async function reserveResearchQuota(userId: string, reportId: string, timeZone: string) {
  const supabase = getServiceSupabase()
  const quota = await getResearchQuota(userId, timeZone)

  if (quota.remaining <= 0) {
    await supabase.from('business_research_usage_logs').insert({
      user_id: userId,
      report_id: reportId,
      local_timezone: timeZone,
      attempt_status: 'rejected_limit',
    })
    throw new Error('Daily report limit reached')
  }

  await supabase.from('business_research_usage_logs').insert({
    user_id: userId,
    report_id: reportId,
    local_timezone: timeZone,
    attempt_status: 'reserved',
  })

  return {
    ...quota,
    remaining: Math.max(quota.remaining - 1, 0),
    used: quota.used + 1,
  }
}

export async function updateUsageStatus(reportId: string, status: 'completed' | 'partial' | 'failed') {
  const supabase = getServiceSupabase()
  await supabase
    .from('business_research_usage_logs')
    .update({ attempt_status: status })
    .eq('report_id', reportId)
    .neq('attempt_status', 'rejected_limit')
}

export async function generateResearchModule(moduleId: ResearchModuleId, request: ResearchRequestPayload) {
  const websiteSignals = await collectWebsiteSignals(request.intent.targetUrl, request.intent.targetName)
  const prompt = buildModulePrompt(moduleId, request, websiteSignals)

  try {
    const completion = await callGroqCompletion(prompt.system, prompt.user, prompt.maxTokens, 0.12)
    const parsed = safeJsonParse<ResearchModulePayload>(completion.content)
    const normalized = normalizePayload(parsed, request.intent.targetName)

    if (normalized && !containsPlaceholderPayload(normalized, request.intent.targetName)) {
      return {
        payload: normalized,
        provider: completion.provider,
      }
    }

    const repair = await callGroqCompletion(
      'You repair malformed or unsupported JSON for LevitateOS research modules. Return only strict JSON and preserve the original business meaning while removing invented placeholders and unsupported quantitative claims.',
      `The prior response for the "${moduleId}" module was not acceptable because it was either malformed JSON or included unsupported / placeholder research content.

Original response:
${completion.content}

Repair requirements:
- Return strict JSON only.
- Remove any placeholder entities such as Company A / Company B / example competitor.
- Remove any unsupported market sizes, competitor counts, revenue figures, funding claims, or benchmark numbers.
- If quantitative evidence is not supportable from the provided context, omit those chart/table structures instead of guessing.
- Keep the summary explicit about evidence limitations when relevant.`,
      Math.min(700, Math.max(420, Math.round(prompt.maxTokens * 0.72))),
      0
    )

    const repaired = normalizePayload(safeJsonParse<ResearchModulePayload>(repair.content), request.intent.targetName)
    if (repaired && !containsPlaceholderPayload(repaired, request.intent.targetName)) {
      return {
        payload: repaired,
        provider: completion.provider,
      }
    }

    throw new Error('Groq returned invalid or unsupported research content')
  } catch (error) {
    throw error instanceof Error ? error : new Error('Unknown Groq generation error')
  }
}

export async function generateLegalNoticeDraft(input: LegalNoticeIntake): Promise<{ draft: LegalNoticeDraft; provider: string }> {
  const fallback: LegalNoticeDraft = {
    title: 'LEGAL NOTICE - Demand for Payment / Performance',
    sections: {
      header: `From: ${input.senderName}\nAddress: ${input.senderAddress}\nContact: ${input.senderContact}\nTo: ${input.recipientName}\nAddress: ${input.recipientAddress}\nContact: ${input.recipientContact}`,
      facts: `You engaged in a ${input.transactionNature} dated ${input.agreementDate || 'the relevant date of obligation'}. The recipient entity is alleged to have committed ${input.breachType}. Key terms noted by the sender include: ${input.agreedTerms || 'terms to be inserted based on the transaction record'}.`,
      legalGrounds: `The sender asserts remedies under the Indian Contract Act 1872 including Sections 37, 39, 55, 73, and 74 where applicable. If the matter concerns cheque dishonour, the Negotiable Instruments Act 1881 including Sections 138 to 142 may apply. If the sender is MSME registered, the MSME Development Act 2006 including Sections 15 to 23 may also apply. Electronic contracting issues may invoke Section 10A of the Information Technology Act 2000, and deliberate fraud may attract the Bharatiya Nyaya Sanhita 2023 where facts support that threshold.`,
      demand: `You are hereby called upon to ${input.noticeObjective}. The principal amount asserted is ${input.principalAmount || 'to be specified'} and the sender also reserves rights relating to agreed interest and other lawful claims.`,
      deadline: `You are required to comply within 15 to 30 days from receipt of this notice, failing which the sender shall initiate appropriate proceedings including civil recovery, summary proceedings, arbitration, MSME reference, cheque dishonour complaint, insolvency remedies, or other reliefs as applicable to the facts.`,
      consequences: `In the event of non-compliance, the sender reserves the right to pursue recovery before the appropriate civil court, commercial court, arbitral forum, MSEFC, consumer forum, or other competent authority. Limitation, jurisdiction, and statutory prerequisites will be asserted strictly in accordance with applicable Indian law.`,
      closing: `This notice is issued without prejudice to all other legal and equitable rights available to the sender.\n\nSender: ${input.senderName}\nAdvocate details: ${input.advocateDetails || 'To be inserted if applicable'}`,
    },
  }

  const system = `You are an Indian legal drafting specialist working alongside a commercial disputes advocate.

Write in formal Indian legal English that reads like a real pre-litigation notice prepared for counsel review.

Rules:
- Output only valid JSON. No markdown fences.
- Do not sound robotic, conversational, promotional, or AI-written.
- Use only those statutes and sections that actually fit the facts presented.
- State dates, defaults, breaches, demands, and consequences clearly and chronologically.
- Where the facts are insufficient for a very specific assertion, draft conservatively instead of inventing facts.
- The notice must be professional, firm, and litigation-ready.`
  const user = `Draft a legal notice from the following facts. Use only laws that fit the facts. Explicitly consider:
- Indian Contract Act 1872 Sections 37, 39, 55, 73, 74
- Negotiable Instruments Act 1881 Sections 138, 139, 141, 142 when cheque dishonour applies
- MSME Development Act 2006 Sections 15, 16, 17, 18, 19, 23 where MSME delayed payment applies
- Information Technology Act 2000 Sections 10A, 43, 66 when electronic contracts or digital services are involved
- Bharatiya Nyaya Sanhita 2023 Sections 316, 318, 61 where fraud is supportable
- Specific Relief Act 1963 Sections 10 and 38 where performance / injunction is relevant
- Code of Civil Procedure 1908 Order 37 where summary suit applies
- Arbitration and Conciliation Act 1996 Section 11 if arbitration applies
- Limitation Act 1963 Section 3 and Article 113
- Commercial Courts Act 2015 for eligible commercial disputes
- Insolvency and Bankruptcy Code 2016 Section 9 for eligible operational debt over threshold
- Consumer Protection Act 2019 where consumer forum relief applies

Facts:
${JSON.stringify(input, null, 2)}

Drafting expectations:
- Open with a formal sender/recipient/date/subject structure.
- Establish facts in a chronological narrative.
- State the legal basis crisply with section numbers and Act names.
- Make a precise demand tied to the claimed amount and/or performance obligation.
- State a commercially reasonable compliance deadline, typically 15 to 30 days depending on the facts.
- Mention the most appropriate next legal steps without sounding theatrical.
- Close with a proper without-prejudice style reservation of rights and signature block.

Return JSON:
{
  "title": "LEGAL NOTICE - ...",
  "sections": {
    "header": "string",
    "facts": "string",
    "legalGrounds": "string",
    "demand": "string",
    "deadline": "string",
    "consequences": "string",
    "closing": "string"
  }
}`

  try {
    const completion = await callGroqCompletion(system, user, 2600, 0.15)
    const parsed = safeJsonParse<LegalNoticeDraft>(completion.content)
    if (!parsed?.sections?.header || !parsed?.sections?.facts || !parsed?.sections?.legalGrounds) {
      const repair = await callGroqCompletion(
        'You repair malformed JSON for Indian legal notices. Return only strict JSON and preserve the formal legal drafting tone.',
        `Repair this draft into valid JSON with title and sections.header, facts, legalGrounds, demand, deadline, consequences, closing:

${completion.content}`,
        2600,
        0
      )
      const repaired = safeJsonParse<LegalNoticeDraft>(repair.content)
      if (repaired?.sections?.header && repaired?.sections?.facts && repaired?.sections?.legalGrounds) {
        return {
          draft: repaired,
          provider: completion.provider,
        }
      }
    }

    if (parsed?.sections?.header && parsed?.sections?.facts && parsed?.sections?.legalGrounds) {
      return {
        draft: parsed,
        provider: completion.provider,
      }
    }
  } catch (error) {
    if (!allowMockBusinessIntelligence()) {
      throw error
    }
  }

  if (allowMockBusinessIntelligence()) {
    return { draft: fallback, provider: 'mock-fallback' }
  }

  throw new Error('Live legal notice generation failed')
}

export async function generateAdvisorRecommendation(input: AdvisorInput) {
  const fallbackCards = [
    input.isMsmeRegistered
      ? {
          title: 'Prioritize MSME remedy path',
          body: 'MSME registration materially strengthens delayed-payment leverage and should be part of the first legal strategy review.',
        }
      : {
          title: 'Start with a formal legal notice',
          body: 'A well-structured notice should usually be sent first to place the defaulting party on record.',
        },
    input.hadCheque
      ? {
          title: 'Check NI Act deadline',
          body: 'If a cheque bounced, ensure the statutory demand notice timeline under Section 138 is still available.',
        }
      : {
          title: 'Review documentary record',
          body: 'Written contracts, invoices, acknowledgements, and WhatsApp/email records will shape the fastest recovery path.',
        },
    input.otherPartyIsRegisteredCompany && input.amountBand === 'above_1_lakh'
      ? {
          title: 'Evaluate company-specific remedies',
          body: 'Commercial court and, in higher-value cases, insolvency-trigger strategies may create stronger pressure.',
        }
      : {
          title: 'Pick the fastest practical forum',
          body: 'The best route often depends on documentary strength, not only the amount involved.',
        },
  ]

  const system = `You are an Indian delayed-payment advisor for business owners. Return concise, practical, legally-aware recommendation cards in JSON only.`
  const user = `Given these answers: ${JSON.stringify(input)}

Return JSON:
{
  "cards": [
    { "title": "string", "body": "string" },
    { "title": "string", "body": "string" },
    { "title": "string", "body": "string" }
  ]
}`

  try {
    const response = await callAI(system, user, 900, 'legal-advisor')
    const parsed = safeJsonParse<{ cards: Array<{ title: string; body: string }> }>(response)
    if (!parsed?.cards?.length) {
      return fallbackCards
    }
    return parsed.cards.slice(0, 3)
  } catch {
    return fallbackCards
  }
}

export function toResearchReportRecord(row: ReportRow): ResearchReportRecord {
  return {
    id: row.id,
    status: (row.status as ResearchReportRecord['status']) ?? 'draft',
    targetName: row.target_name,
    targetType: row.target_type as ResearchReportRecord['targetType'],
    targetUrl: row.target_url,
    notes: row.notes,
    intelligenceScore: row.intelligence_score,
    reportSummary: row.report_summary,
    selectedModules: normalizeSelectedModules(row.selected_modules),
    moduleResults: normalizeResearchModuleResults(row.module_results, row.target_name),
    shareToken: row.share_token,
    createdAt: row.created_at,
    archivedAt: row.archived_at,
    businessProfile: row.business_profile && typeof row.business_profile === 'object'
      ? ({ preferredTimezone: 'Asia/Kolkata', ...row.business_profile } as BusinessProfilePayload)
      : {
          businessName: '',
          oneLineDescription: '',
          industry: '',
          subIndustry: '',
          businessModelType: 'other',
          primaryGeographies: [],
          companyStage: 'idea_stage',
          teamSizeRange: 'solo',
          registrationStatus: 'other',
          isMsmeRegistered: false,
          annualRevenueBracket: '',
          primarySalesChannels: [],
          preferredTimezone: 'Asia/Kolkata',
        },
  }
}

function createDocxParagraphs(title: string, body: string) {
  const lines = body.split('\n').filter(Boolean)
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: title, bold: true })],
    }),
    ...lines.map(line => new Paragraph({ children: [new TextRun(line)] })),
  ]
}

function ensurePdfSpace(pdf: jsPDF, cursor: number, requiredHeight: number, onNewPage: () => void) {
  const pageHeight = pdf.internal.pageSize.getHeight()
  if (cursor + requiredHeight <= pageHeight - 56) {
    return cursor
  }

  pdf.addPage()
  onNewPage()
  return 108
}

function writeWrappedText(pdf: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 14) {
  const lines = pdf.splitTextToSize(text, width)
  pdf.text(lines, x, y)
  return y + lines.length * lineHeight
}

function drawLegalPdfChrome(pdf: jsPDF, subtitle?: string) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  pdf.setDrawColor(215, 205, 191)
  pdf.setLineWidth(0.8)
  pdf.roundedRect(26, 26, pageWidth - 52, pageHeight - 52, 10, 10)
  pdf.setDrawColor(233, 225, 214)
  pdf.line(42, 84, pageWidth - 42, 84)
  pdf.setFont('times', 'bold')
  pdf.setFontSize(15)
  pdf.setTextColor(40, 29, 20)
  pdf.text('LEGAL NOTICE', pageWidth / 2, 56, { align: 'center' })

  if (subtitle) {
    pdf.setFont('times', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(117, 101, 86)
    pdf.text(subtitle, pageWidth / 2, 71, { align: 'center' })
  }
}

function drawReportPdfChrome(pdf: jsPDF, title = 'LevitateOS Intelligence Report') {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  pdf.setFillColor(249, 243, 233)
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')
  pdf.setDrawColor(220, 208, 190)
  pdf.roundedRect(24, 24, pageWidth - 48, pageHeight - 48, 12, 12)
  pdf.setDrawColor(236, 224, 206)
  pdf.line(42, 84, pageWidth - 42, 84)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(36, 24, 15)
  pdf.text(title, 46, 60)
}

export async function buildLegalNoticeDocx(draft: LegalNoticeDraft) {
  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1800,
              right: 1800,
              bottom: 1800,
              left: 1800,
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: draft.title, bold: true, size: 28 })],
          }),
          ...createDocxParagraphs('Header', draft.sections.header),
          ...createDocxParagraphs('Facts', draft.sections.facts),
          ...createDocxParagraphs('Legal Grounds', draft.sections.legalGrounds),
          ...createDocxParagraphs('Demand', draft.sections.demand),
          ...createDocxParagraphs('Deadline', draft.sections.deadline),
          ...createDocxParagraphs('Consequences', draft.sections.consequences),
          ...createDocxParagraphs('Closing', draft.sections.closing),
        ],
      },
    ],
  })

  return Packer.toBuffer(document)
}

export function buildLegalNoticePdf(draft: LegalNoticeDraft) {
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
  })

  drawLegalPdfChrome(pdf, draft.title)
  pdf.setFont('times', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(36, 24, 15)
  pdf.text(draft.title, pdf.internal.pageSize.getWidth() / 2, 106, { align: 'center' })

  let cursor = 138
  const sections = [
    ['Formal Header', draft.sections.header],
    ['Facts and Chronology', draft.sections.facts],
    ['Legal Grounds', draft.sections.legalGrounds],
    ['Demand', draft.sections.demand],
    ['Deadline', draft.sections.deadline],
    ['Consequences', draft.sections.consequences],
    ['Closing', draft.sections.closing],
  ] as const

  for (const [label, text] of sections) {
    const estimatedHeight = pdf.splitTextToSize(text, 460).length * 15 + 54
    cursor = ensurePdfSpace(pdf, cursor, estimatedHeight, () => drawLegalPdfChrome(pdf, draft.title))

    pdf.setFillColor(250, 245, 238)
    pdf.setDrawColor(224, 212, 196)
    pdf.roundedRect(42, cursor - 8, pdf.internal.pageSize.getWidth() - 84, estimatedHeight, 8, 8, 'FD')

    pdf.setFont('times', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(145, 102, 45)
    pdf.text(label.toUpperCase(), 56, cursor + 12)

    pdf.setFont('times', 'normal')
    pdf.setFontSize(12)
    pdf.setTextColor(30, 24, 19)
    cursor = writeWrappedText(pdf, text, 56, cursor + 32, 460, 15) + 20
  }

  const pageCount = pdf.getNumberOfPages()
  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    pdf.setPage(pageIndex)
    pdf.setFont('times', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(145, 130, 114)
    pdf.text(
      `LevitateOS legal workspace • page ${pageIndex} of ${pageCount}`,
      pdf.internal.pageSize.getWidth() - 42,
      pdf.internal.pageSize.getHeight() - 28,
      { align: 'right' }
    )
  }

  return Buffer.from(pdf.output('arraybuffer'))
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function toneToPdfColor(tone?: Chip['tone']) {
  if (tone === 'blue') return [111, 156, 215] as const
  if (tone === 'green') return [98, 179, 139] as const
  if (tone === 'red') return [202, 107, 101] as const
  if (tone === 'orange') return [210, 140, 85] as const
  if (tone === 'gold') return [201, 165, 90] as const
  return [124, 117, 107] as const
}

function drawPdfLabel(pdf: jsPDF, label: string, x: number, y: number) {
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(145, 102, 45)
  pdf.text(label.toUpperCase(), x, y)
}

function drawPdfSoftCard(pdf: jsPDF, x: number, y: number, width: number, height: number) {
  pdf.setFillColor(255, 252, 247)
  pdf.setDrawColor(224, 212, 196)
  pdf.roundedRect(x, y, width, height, 12, 12, 'FD')
}

function drawPdfScoreDial(pdf: jsPDF, score: number | null, x: number, y: number, size: number) {
  const normalized = Math.max(0, Math.min(score ?? 0, 100))
  const centerX = x + size / 2
  const centerY = y + size / 2
  const radius = size / 2 - 10
  const [r, g, b] = toneToPdfColor(
    normalized >= 85 ? 'gold' : normalized >= 70 ? 'green' : normalized >= 55 ? 'orange' : 'red'
  )

  pdf.setDrawColor(233, 224, 212)
  pdf.setLineWidth(8)
  pdf.circle(centerX, centerY, radius, 'S')

  pdf.setDrawColor(r, g, b)
  pdf.setLineWidth(4)
  pdf.circle(centerX, centerY, radius - 12, 'S')

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(126, 109, 91)
  pdf.text('INTELLIGENCE', centerX, centerY - 10, { align: 'center' })
  pdf.text('SCORE', centerX, centerY + 4, { align: 'center' })
  pdf.setFontSize(28)
  pdf.setTextColor(36, 24, 15)
  pdf.text(score == null ? '-' : String(score), centerX, centerY + 34, { align: 'center' })
}

function drawPdfMetricCards(pdf: jsPDF, cards: MetricCard[], startY: number, maxWidth: number) {
  if (!cards.length) {
    return startY
  }

  drawPdfLabel(pdf, 'Key Metrics', 58, startY + 12)
  let cursor = startY + 24

  chunkItems(cards.slice(0, 4), 2).forEach((row) => {
    row.forEach((card, index) => {
      const cardWidth = (maxWidth - 12) / 2
      const cardX = 58 + index * (cardWidth + 12)
      drawPdfSoftCard(pdf, cardX, cursor, cardWidth, 64)
      drawPdfLabel(pdf, card.label, cardX + 12, cursor + 18)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)
      pdf.setTextColor(36, 24, 15)
      pdf.text(card.value, cardX + 12, cursor + 38)
      if (card.detail) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        pdf.setTextColor(108, 91, 73)
        writeWrappedText(pdf, card.detail, cardX + 12, cursor + 52, cardWidth - 24, 11)
      }
    })

    cursor += 76
  })

  return cursor
}

function drawPdfProgressMeters(pdf: jsPDF, meters: ProgressMeter[], startY: number, width: number) {
  if (!meters.length) {
    return startY
  }

  drawPdfLabel(pdf, 'Progress Signals', 58, startY + 12)
  let cursor = startY + 28

  meters.slice(0, 3).forEach((meter) => {
    const [r, g, b] = toneToPdfColor(meter.tone)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(48, 35, 24)
    pdf.text(`${meter.label} (${meter.value}%)`, 58, cursor)
    pdf.setFillColor(238, 227, 212)
    pdf.roundedRect(58, cursor + 8, width, 8, 4, 4, 'F')
    pdf.setFillColor(r, g, b)
    pdf.roundedRect(58, cursor + 8, (width * Math.min(Math.max(meter.value, 0), 100)) / 100, 8, 4, 4, 'F')
    cursor += 30
  })

  return cursor
}

type PdfNarrativeSection = {
  title: string
  lines: string[]
}

function buildPdfNarrativeSections(payload: ResearchModulePayload): PdfNarrativeSection[] {
  const sections: PdfNarrativeSection[] = []

  payload.listSections?.slice(0, 2).forEach((section) => {
    const lines = section.items
      .slice(0, 4)
      .map((item) => `${item.title}: ${item.description}`)
    if (lines.length) {
      sections.push({
        title: section.title,
        lines,
      })
    }
  })

  payload.cardGroups?.slice(0, 2).forEach((group) => {
    const lines = group.cards
      .slice(0, 4)
      .map((card) => `${card.title}${card.subtitle ? ` (${card.subtitle})` : ''}: ${card.body || card.details?.map((detail) => `${detail.label}: ${detail.value}`).join(', ') || 'Key module finding.'}`)
    if (lines.length) {
      sections.push({
        title: group.title,
        lines,
      })
    }
  })

  payload.quadrants?.slice(0, 4).forEach((quadrant) => {
    const lines = quadrant.items
      .slice(0, 2)
      .map((item) => `${item.title}: ${item.description}`)
    if (lines.length) {
      sections.push({
        title: quadrant.title,
        lines,
      })
    }
  })

  payload.tables?.slice(0, 1).forEach((table) => {
    const lines = table.rows.slice(0, 4).map((row) =>
      table.columns
        .map((column) => `${column.label}: ${row.cells[column.key]?.value ?? '-'}`)
        .join(' | ')
    )
    if (lines.length) {
      sections.push({
        title: table.title,
        lines,
      })
    }
  })

  payload.heatmaps?.slice(0, 1).forEach((heatmap) => {
    const lines = heatmap.items
      .slice(0, 4)
      .map((item) => `${item.label}: impact ${item.impact}/5, probability ${item.probability}/5${item.detail ? ` - ${item.detail}` : ''}`)
    if (lines.length) {
      sections.push({
        title: heatmap.title,
        lines,
      })
    }
  })

  payload.timelines?.slice(0, 1).forEach((timeline) => {
    const lines = timeline.items
      .slice(0, 4)
      .map((item) => `${item.label}: ${item.start}${item.end ? ` to ${item.end}` : ''}${item.detail ? ` - ${item.detail}` : ''}`)
    if (lines.length) {
      sections.push({
        title: timeline.title,
        lines,
      })
    }
  })

  return sections.slice(0, 4)
}

function estimatePdfNarrativeHeight(pdf: jsPDF, payload: ResearchModulePayload, width: number) {
  const sections = buildPdfNarrativeSections(payload)
  if (!sections.length) {
    return 0
  }

  return sections.reduce((height, section) => {
    const text = section.lines.join('\n')
    const lineCount = pdf.splitTextToSize(text, width - 28).length
    return height + Math.max(50, lineCount * 12 + 30) + 10
  }, 24)
}

function drawPdfNarrativeSections(pdf: jsPDF, payload: ResearchModulePayload, startY: number, width: number) {
  const sections = buildPdfNarrativeSections(payload)
  if (!sections.length) {
    return startY
  }

  drawPdfLabel(pdf, 'Expanded Findings', 58, startY + 12)
  let cursor = startY + 24

  sections.forEach((section) => {
    const text = section.lines.join('\n')
    const lineCount = pdf.splitTextToSize(text, width - 28).length
    const boxHeight = Math.max(50, lineCount * 12 + 30)
    drawPdfSoftCard(pdf, 58, cursor, width, boxHeight)
    drawPdfLabel(pdf, section.title, 72, cursor + 18)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(48, 35, 24)
    writeWrappedText(pdf, text, 72, cursor + 34, width - 28, 12)
    cursor += boxHeight + 10
  })

  return cursor
}

function drawPdfBarChart(
  pdf: jsPDF,
  title: string,
  data: Array<{ label: string; value: number; tone?: Chip['tone'] }>,
  startY: number,
  width: number
) {
  drawPdfSoftCard(pdf, 58, startY, width, 158)
  drawPdfLabel(pdf, title, 72, startY + 18)
  const trimmed = data.slice(0, 4)
  const maxValue = Math.max(1, ...trimmed.map((item) => item.value))
  let cursor = startY + 38

  trimmed.forEach((item) => {
    const [r, g, b] = toneToPdfColor(item.tone)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(48, 35, 24)
    pdf.text(item.label, 72, cursor)
    pdf.text(String(item.value), 58 + width - 18, cursor, { align: 'right' })
    pdf.setFillColor(238, 227, 212)
    pdf.roundedRect(72, cursor + 8, width - 28, 9, 4, 4, 'F')
    pdf.setFillColor(r, g, b)
    pdf.roundedRect(72, cursor + 8, ((width - 28) * item.value) / maxValue, 9, 4, 4, 'F')
    cursor += 28
  })

  return startY + 172
}

function drawPdfDonutChart(
  pdf: jsPDF,
  title: string,
  data: Array<{ name: string; value: number; color?: string }>,
  startY: number,
  width: number
) {
  drawPdfSoftCard(pdf, 58, startY, width, 172)
  drawPdfLabel(pdf, title, 72, startY + 18)

  const total = data.reduce((sum, item) => sum + item.value, 0)
  let legendY = startY + 48
  let barX = 72
  const barY = startY + 126
  const barWidth = width - 28

  data.slice(0, 4).forEach((item) => {
    const [r, g, b] = item.color?.startsWith('#')
      ? [
          parseInt(item.color.slice(1, 3), 16),
          parseInt(item.color.slice(3, 5), 16),
          parseInt(item.color.slice(5, 7), 16),
        ]
      : toneToPdfColor('gold')

    pdf.setFillColor(r, g, b)
    pdf.circle(84, legendY - 3, 3, 'F')
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(48, 35, 24)
    pdf.text(item.name, 94, legendY)
    pdf.text(String(item.value), 58 + width - 18, legendY, { align: 'right' })
    const segmentWidth = total > 0 ? (barWidth * item.value) / total : 0
    pdf.setFillColor(r, g, b)
    pdf.roundedRect(barX, barY, segmentWidth, 12, 4, 4, 'F')
    barX += segmentWidth
    legendY += 24
  })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(20)
  pdf.setTextColor(36, 24, 15)
  pdf.text(String(total), 72, startY + 146)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(124, 117, 107)
  pdf.text('Total distribution', 118, startY + 146)

  return startY + 186
}

function drawPdfLineChart(
  pdf: jsPDF,
  title: string,
  series: Array<{ name: string; color?: string; points: Array<{ x: string; y: number }> }>,
  startY: number,
  width: number
) {
  drawPdfSoftCard(pdf, 58, startY, width, 188)
  drawPdfLabel(pdf, title, 72, startY + 18)

  const chartX = 76
  const chartY = startY + 36
  const chartWidth = width - 36
  const chartHeight = 110
  const allPoints = series.flatMap((item) => item.points.map((point) => point.y))
  const min = Math.min(...allPoints, 0)
  const max = Math.max(...allPoints, 1)
  const range = Math.max(max - min, 1)

  pdf.setDrawColor(234, 223, 209)
  pdf.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight)
  pdf.line(chartX, chartY, chartX, chartY + chartHeight)

  series.slice(0, 3).forEach((entry, seriesIndex) => {
    const [r, g, b] = entry.color?.startsWith('#')
      ? [
          parseInt(entry.color.slice(1, 3), 16),
          parseInt(entry.color.slice(3, 5), 16),
          parseInt(entry.color.slice(5, 7), 16),
        ]
      : toneToPdfColor(seriesIndex === 0 ? 'gold' : seriesIndex === 1 ? 'blue' : 'green')

    pdf.setDrawColor(r, g, b)
    pdf.setFillColor(r, g, b)
    pdf.setLineWidth(2)

    entry.points.forEach((point, index) => {
      const pointX = chartX + (chartWidth / Math.max(entry.points.length - 1, 1)) * index
      const pointY = chartY + chartHeight - ((point.y - min) / range) * chartHeight
      if (index === 0) {
        pdf.moveTo(pointX, pointY)
      } else {
        pdf.lineTo(pointX, pointY)
      }
      pdf.circle(pointX, pointY, 2.5, 'F')
    })

    pdf.stroke()
  })

  const xLabels = series[0]?.points ?? []
  xLabels.forEach((point, index) => {
    const pointX = chartX + (chartWidth / Math.max(xLabels.length - 1, 1)) * index
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(124, 117, 107)
    pdf.text(point.x, pointX, chartY + chartHeight + 14, { align: 'center' })
  })

  const legendY = startY + 162
  series.slice(0, 3).forEach((entry, index) => {
    const [r, g, b] = entry.color?.startsWith('#')
      ? [
          parseInt(entry.color.slice(1, 3), 16),
          parseInt(entry.color.slice(3, 5), 16),
          parseInt(entry.color.slice(5, 7), 16),
        ]
      : toneToPdfColor(index === 0 ? 'gold' : index === 1 ? 'blue' : 'green')

    pdf.setFillColor(r, g, b)
    pdf.circle(84 + index * 120, legendY - 3, 3, 'F')
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(48, 35, 24)
    pdf.text(entry.name, 92 + index * 120, legendY)
  })

  return startY + 202
}

function drawPdfModuleVisual(pdf: jsPDF, payload: ResearchModulePayload, startY: number, width: number) {
  if (payload.barCharts?.length) {
    return drawPdfBarChart(pdf, payload.barCharts[0].title, payload.barCharts[0].data, startY, width)
  }

  if (payload.donutCharts?.length) {
    return drawPdfDonutChart(pdf, payload.donutCharts[0].title, payload.donutCharts[0].data, startY, width)
  }

  if (payload.lineCharts?.length) {
    return drawPdfLineChart(pdf, payload.lineCharts[0].title, payload.lineCharts[0].series, startY, width)
  }

  return startY
}

export async function buildReportDocx(report: ResearchReportRecord) {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'LevitateOS Intelligence Report', bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: report.targetName, bold: true, size: 26 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(`Business context: ${report.businessProfile.businessName || 'Not provided'}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(`Generated ${new Date(report.createdAt).toLocaleString('en-IN')}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(`Intelligence Score: ${report.intelligenceScore ?? 'Pending'}`)],
    }),
    new Paragraph({
      children: [new TextRun(report.reportSummary || 'Structured module findings follow in the next sections.')],
    }),
  ]

  report.selectedModules.forEach((moduleId, index) => {
    const result = report.moduleResults[moduleId]
    if (!result) {
      return
    }

    children.push(
      new Paragraph({
        pageBreakBefore: index > 0,
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: result.title, bold: true })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Status: ${result.status}`, bold: true })],
      })
    )

    if (result.payload?.summary) {
      children.push(new Paragraph({ children: [new TextRun(result.payload.summary)] }))
    }

    result.payload?.metricCards?.slice(0, 4).forEach((card) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${card.label}: `, bold: true }),
            new TextRun(card.value),
            ...(card.detail ? [new TextRun(` - ${card.detail}`)] : []),
          ],
        })
      )
    })

    result.payload?.progressMeters?.slice(0, 3).forEach((meter) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${meter.label}: `, bold: true }),
            new TextRun(`${meter.value}%`),
            ...(meter.detail ? [new TextRun(` - ${meter.detail}`)] : []),
          ],
        })
      )
    })

    if (result.payload?.callout) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${result.payload.callout.title}: `, bold: true }),
            new TextRun(result.payload.callout.body),
          ],
        })
      )
    }
  })

  const document = new Document({
    sections: [
      {
        children: children.concat([
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'LevitateOS Intelligence Report', bold: true, size: 32 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun(`${report.targetName} • ${report.businessProfile.businessName || 'Business context not provided'}`)],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun(`Generated ${new Date(report.createdAt).toLocaleString('en-IN')}`)],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun(`Intelligence Score: ${report.intelligenceScore ?? 'Pending'}`)],
          }),
          ...report.selectedModules.flatMap(moduleId => {
            const result = report.moduleResults[moduleId]
            if (!result) {
              return []
            }

            return createDocxParagraphs(
              result.title,
              [
                `Status: ${result.status}`,
                result.payload?.summary ?? '',
                result.payload?.callout ? `${result.payload.callout.title}: ${result.payload.callout.body}` : '',
              ]
                .filter(Boolean)
                .join('\n')
            )
          }),
        ]),
      },
    ],
  })

  return Packer.toBuffer(document)
}

export function buildReportPdf(report: ResearchReportRecord) {
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
  })

  drawReportPdfChrome(pdf)
  const pageWidth = pdf.internal.pageSize.getWidth()
  const moduleVisualWidth = 474
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(30)
  pdf.setTextColor(38, 26, 15)
  const titleLines = pdf.splitTextToSize(report.targetName, 460)
  pdf.text(titleLines, 46, 126)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(12)
  pdf.setTextColor(108, 91, 73)
  const metaStartY = 126 + titleLines.length * 16 + 12
  pdf.text(`Business context: ${report.businessProfile.businessName || 'Not provided'}`, 46, metaStartY)
  pdf.text(`Generated: ${new Date(report.createdAt).toLocaleString('en-IN')}`, 46, metaStartY + 18)
  pdf.text(`Modules: ${report.selectedModules.length}`, 46, metaStartY + 36)

  drawPdfSoftCard(pdf, 46, metaStartY + 56, 220, 210)
  drawPdfScoreDial(pdf, report.intelligenceScore, 78, metaStartY + 78, 156)

  const executiveSummary = report.reportSummary || 'Structured module findings follow on the next pages.'
  const summaryX = 286
  const summaryWidth = pageWidth - summaryX - 46
  const summaryLines = pdf.splitTextToSize(executiveSummary, summaryWidth - 28)
  const summaryHeight = Math.max(210, summaryLines.length * 15 + 56)
  drawPdfSoftCard(pdf, summaryX, metaStartY + 56, summaryWidth, summaryHeight)
  drawPdfLabel(pdf, 'Executive Summary', summaryX + 16, metaStartY + 74)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(12)
  pdf.setTextColor(48, 35, 24)
  writeWrappedText(
    pdf,
    executiveSummary,
    summaryX + 16,
    metaStartY + 98,
    summaryWidth - 32,
    15
  )

  let chipX = 46
  let chipY = metaStartY + 56 + summaryHeight + 26
  drawPdfLabel(pdf, 'Included Modules', 46, chipY - 8)
  report.selectedModules.forEach((moduleId) => {
    const moduleMeta = RESEARCH_MODULES.find((item) => item.id === moduleId)
    const label = moduleMeta?.shortLabel ?? moduleId
    const chipWidth = Math.max(60, label.length * 6 + 26)
    if (chipX + chipWidth > pageWidth - 46) {
      chipX = 46
      chipY += 24
    }
    pdf.setFillColor(248, 239, 222)
    pdf.setDrawColor(216, 194, 154)
    pdf.roundedRect(chipX, chipY, chipWidth, 18, 9, 9, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(145, 102, 45)
    pdf.text(label.toUpperCase(), chipX + 10, chipY + 12)
    chipX += chipWidth + 8
  })

  pdf.addPage()
  drawReportPdfChrome(pdf, 'LevitateOS Intelligence Modules')

  let cursor = 108
  for (const moduleId of report.selectedModules) {
    const result = report.moduleResults[moduleId]
    if (!result) continue

    const summaryText = [
      `Status: ${result.status}`,
      result.payload?.summary ?? '',
    ]
      .filter(Boolean)
      .join('\n')
    const summaryHeight = pdf.splitTextToSize(summaryText, 474).length * 14 + 14
    const metricCount = Math.min(result.payload?.metricCards?.length ?? 0, 4)
    const metricHeight = metricCount > 0 ? 24 + Math.ceil(metricCount / 2) * 76 : 0
    const progressCount = Math.min(result.payload?.progressMeters?.length ?? 0, 3)
    const progressHeight = progressCount > 0 ? 28 + progressCount * 30 : 0
    const calloutHeight = result.payload?.callout
      ? Math.max(42, pdf.splitTextToSize(result.payload.callout.body, 448).length * 12 + 20) + 12
      : 0
    const narrativeHeight = result.payload ? estimatePdfNarrativeHeight(pdf, result.payload, moduleVisualWidth) : 0
    const visualHeight =
      result.payload?.barCharts?.length
        ? 172
        : result.payload?.donutCharts?.length
          ? 186
          : result.payload?.lineCharts?.length
            ? 202
            : 0
    const estimatedHeight = 58 + summaryHeight + metricHeight + progressHeight + calloutHeight + narrativeHeight + visualHeight + 24
    cursor = ensurePdfSpace(pdf, cursor, estimatedHeight, () => drawReportPdfChrome(pdf, 'LevitateOS Intelligence Modules'))

    pdf.setFillColor(255, 252, 247)
    pdf.setDrawColor(224, 212, 196)
    pdf.roundedRect(42, cursor - 8, pdf.internal.pageSize.getWidth() - 84, estimatedHeight, 12, 12, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(36, 24, 15)
    pdf.text(result.title, 58, cursor + 16)

    pdf.setFontSize(10)
    pdf.setTextColor(145, 102, 45)
    pdf.text(`STATUS • ${result.status.toUpperCase()}`, pdf.internal.pageSize.getWidth() - 58, cursor + 16, { align: 'right' })

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.setTextColor(48, 35, 24)
    let innerCursor = writeWrappedText(pdf, summaryText, 58, cursor + 40, 474, 14) + 6

    innerCursor = drawPdfMetricCards(pdf, result.payload?.metricCards ?? [], innerCursor, 474)
    innerCursor = drawPdfProgressMeters(pdf, result.payload?.progressMeters ?? [], innerCursor, 474)

    if (result.payload?.callout) {
      const calloutLines = pdf.splitTextToSize(result.payload.callout.body, 448)
      const calloutHeight = Math.max(42, calloutLines.length * 12 + 20)
      pdf.setFillColor(247, 237, 217)
      pdf.roundedRect(58, innerCursor + 2, 474, calloutHeight, 8, 8, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.setTextColor(145, 102, 45)
      pdf.text(result.payload.callout.title.toUpperCase(), 70, innerCursor + 18)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(48, 35, 24)
      writeWrappedText(pdf, result.payload.callout.body, 70, innerCursor + 32, 448, 12)
      innerCursor += calloutHeight + 12
    }

    if (result.payload) {
      innerCursor = drawPdfNarrativeSections(pdf, result.payload, innerCursor, moduleVisualWidth)
    }

    if (result.payload) {
      const visualCursor = drawPdfModuleVisual(pdf, result.payload, innerCursor + 2, moduleVisualWidth)
      if (visualCursor > innerCursor) {
        innerCursor = visualCursor + 12
      }
    }

    cursor = innerCursor + 18
  }

  const pageCount = pdf.getNumberOfPages()
  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    pdf.setPage(pageIndex)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(145, 130, 114)
    pdf.text(
      `LevitateOS intelligence report • page ${pageIndex} of ${pageCount}`,
      pdf.internal.pageSize.getWidth() - 42,
      pdf.internal.pageSize.getHeight() - 28,
      { align: 'right' }
    )
  }

  return Buffer.from(pdf.output('arraybuffer'))
}

export function summarizeReportResults(results: Record<string, ResearchModuleResult>, selectedModules: ResearchModuleId[]) {
  const summaryBits = selectedModules
    .map(moduleId => results[moduleId]?.payload?.summary)
    .filter((value): value is string => Boolean(value))

  return summaryBits.slice(0, 3).join(' ')
}

export function finalizeReport(results: Record<string, ResearchModuleResult>, selectedModules: ResearchModuleId[]) {
  return {
    intelligenceScore: averageModuleScore(results),
    reportStatus: getModuleCompletionState(results, selectedModules),
    summary: summarizeReportResults(results, selectedModules),
  }
}

export function getDelayedPaymentOptions() {
  return DELAYED_PAYMENT_OPTIONS
}

export function getPlainTextForReport(report: ResearchReportRecord) {
  return reportToPlainText(report)
}

export function getPlainTextForLegalNotice(draft: LegalNoticeDraft) {
  return legalNoticeToPlainText(draft)
}
