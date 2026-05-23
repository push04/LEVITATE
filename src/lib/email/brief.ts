export type EmailAudience = 'external' | 'internal'

export const LEVITATE_BRIEF_FOOTER = [
  '---',
  'LEVITATE LABS  ·  PLATFORM DOCUMENTATION',
  'LevitateOS',
  'Comprehensive Platform Documentation,',
  'Technical Architecture & Deep Market Intelligence Report',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  'Prepared by  Levitate Labs Intelligence Division',
  'Date  April 2026',
  'Version  2.0 — Full-Stack Edition',
  'Classification  CONFIDENTIAL — INTERNAL USE ONLY',
  'levitatelabs.online  |  github.com/push04/LEVITATE',
  '',
  'Document Notice',
  'This document is a proprietary internal report for Levitate Labs and its stakeholders. Market data is sourced from Grand View Research, MarketsandMarkets, Precedence Research, Statista, Fortune Business Insights, IAMAI, SaaSBoomi, Meta Business Reports, SIDBI, Mordor Intelligence, and other publicly available research as of April 2026. All figures are in USD unless stated otherwise. Indian Rupee (INR) figures use an approximate exchange rate of 1 USD = ₹83.',
].join('\n')

export const LEVITATE_INTERNAL_HEADER = [
  'LEVITATE LABS  ·  PLATFORM DOCUMENTATION',
  'LevitateOS',
  'Comprehensive Platform Documentation,',
  'Technical Architecture & Deep Market Intelligence Report',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  'Prepared by  Levitate Labs Intelligence Division',
  'Date  April 2026',
  'Version  2.0 — Full-Stack Edition',
  'Classification  CONFIDENTIAL — INTERNAL USE ONLY',
  'levitatelabs.online  |  github.com/push04/LEVITATE',
  '',
  'Document Notice',
  'This document is a proprietary internal report for Levitate Labs and its stakeholders. Market data is sourced from Grand View Research, MarketsandMarkets, Precedence Research, Statista, Fortune Business Insights, IAMAI, SaaSBoomi, Meta Business Reports, SIDBI, Mordor Intelligence, and other publicly available research as of April 2026. All figures are in USD unless stated otherwise. Indian Rupee (INR) figures use an approximate exchange rate of 1 USD = ₹83.',
].join('\n')

// A longer "brief" (cover + notice + TOC + executive summary) for internal-only emails.
export const LEVITATE_REPORT_BRIEF_INTERNAL = [
  'LEVITATE LABS  ·  PLATFORM DOCUMENTATION',
  'LevitateOS',
  'Comprehensive Platform Documentation,',
  'Technical Architecture & Deep Market Intelligence Report',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  'Prepared by  Levitate Labs Intelligence Division',
  'Date  April 2026',
  'Version  2.0 — Full-Stack Edition',
  'Classification  CONFIDENTIAL — INTERNAL USE ONLY',
  'levitatelabs.online  |  github.com/push04/LEVITATE',
  '',
  'Document Notice',
  'This document is a proprietary internal report for Levitate Labs and its stakeholders. Market data is sourced from Grand View Research, MarketsandMarkets, Precedence Research, Statista, Fortune Business Insights, IAMAI, SaaSBoomi, Meta Business Reports, SIDBI, Mordor Intelligence, and other publicly available research as of April 2026. All figures are in USD unless stated otherwise. INR figures use ~1 USD = INR 83.',
  '',
  'Table of Contents',
  '01  Executive Summary\t3',
  '02  About Levitate Labs & LevitateOS\t4',
  '03  Technical Architecture — Repository Analysis\t5',
  '04  Platform Modules & Feature Deep Dive\t7',
  '05  How LevitateOS Is Unique & Different\t9',
  '06  Competitive Landscape & Comparison\t11',
  '07  Global CRM Market Research\t14',
  '08  Marketing Automation Market Research\t16',
  '09  WhatsApp Business Ecosystem\t17',
  '10  Lead Generation Software Market\t19',
  '11  India MSME & SaaS Market Opportunity\t20',
  '12  Target Market Analysis\t22',
  '13  Revenue Model & Pricing Analysis\t23',
  '14  How Levitate Can Scale\t25',
  '15  Key Questions Answered (Strategic FAQ)\t27',
  '16  SWOT Analysis\t29',
  '17  Roadmap & Conclusion\t30',
  '',
  '01  Executive Summary',
  'The big picture at a glance',
  '',
  'Overview',
  'Levitate Labs is a Vadodara-based digital agency and platform builder. Its flagship product, LevitateOS, is a WhatsApp-first business operating system that integrates CRM, lead generation, WhatsApp automation, email marketing, Meta and LinkedIn workflows, project execution, file management, branded business routes, and revenue analytics into a single workspace.',
  '',
  'The platform is engineered on a modern serverless stack (Next.js, React, Supabase/Postgres + Realtime, Netlify Functions) with an AI layer and specialized agents for lead finding, outreach, discovery, proposal generation, delivery tracking, and retention. Unit economics are optimized by minimizing fixed infrastructure cost early and monetizing through subscription.',
  '',
  'Strategic Market Positioning',
  'LevitateOS sits inside the global CRM and marketing automation market (estimates vary by firm) with strong multi-year growth. India is uniquely WhatsApp-centric, and SMB adoption is structurally higher than email-first markets. LevitateOS is positioned as India-first, INR-priced, WhatsApp-native, and context-aware, with an operating-layer approach that reduces tool sprawl for service businesses.',
].join('\n')

export function withBrief(body: string, audience: EmailAudience = 'external') {
  const normalized = String(body ?? '').trim()
  if (!normalized) return normalized

  // Avoid double-appending.
  if (normalized.includes('LEVITATE LABS  ·  PLATFORM DOCUMENTATION')) return normalized
  if (normalized.includes('LEVITATE LABS | PLATFORM DOCUMENTATION')) return normalized

  if (audience === 'internal') {
    return `${LEVITATE_REPORT_BRIEF_INTERNAL}\n\n${normalized}\n\n${LEVITATE_BRIEF_FOOTER}`
  }

  return `${normalized}\n\n${LEVITATE_BRIEF_FOOTER}`
}
