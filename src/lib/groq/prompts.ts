import { type IntakeService } from '@/lib/types/intake';

export const SERVICES: IntakeService[] = [
  { slug: 'social_10',     name: '10 Social Media Posts / Month',        category: 'social_media', description: 'Monthly package of 10 fully customized, brand-aligned posts for your social channels.' },
  { slug: 'social_20',     name: '20 Social Media Posts / Month',        category: 'social_media', description: 'Scale your content output with 20 tailored posts per month.' },
  { slug: 'social_30',     name: '30 Social Media Posts / Month',        category: 'social_media', description: 'Maximum content velocity with 30 high-quality, branded social posts per month.' },
  { slug: 'review_active', name: 'Active Review Management',             category: 'reputation',   description: 'Proactive monitoring and response to customer reviews across all platforms.' },
  { slug: 'amazon_15',     name: 'Amazon Listing (up to 15 products)',   category: 'marketplace',  description: 'Complete Amazon listing creation and optimization for up to 15 products with SEO-optimized copy.' },
  { slug: 'flipkart_15',   name: 'Flipkart Listing (up to 15 products)', category: 'marketplace',  description: 'Full Flipkart catalog setup and listing for up to 15 products.' },
  { slug: 'meesho_15',     name: 'Meesho Listing (up to 15 products)',   category: 'marketplace',  description: 'End-to-end Meesho product listing for up to 15 SKUs.' },
  { slug: 'pr_initial',    name: 'Initial PR Article Writing',           category: 'pr',           description: 'One professionally written PR article to establish your brand narrative in media.' },
  { slug: 'leads_300',     name: '300 AI-Qualified Leads',               category: 'lead_gen',     description: 'A database of 300 verified, AI-qualified leads relevant to your industry and geography.' },
  { slug: 'leads_500',     name: '500 AI-Qualified Leads',               category: 'lead_gen',     description: 'A premium database of 500 highly targeted, AI-qualified leads for accelerated outreach.' },
  { slug: 'listing_opt',   name: 'Listing Optimization',                 category: 'marketplace',  description: 'Audit and rewrite existing marketplace listings for maximum visibility and conversions.' },
  { slug: 'analytics',     name: 'Monthly Analytics Report',             category: 'analytics',    description: 'Comprehensive monthly report covering all channel performance, growth metrics, and actionable insights.' },
  { slug: 'pr_premium',    name: 'Premium PR Campaign Setup',            category: 'pr',           description: 'Full multi-article PR campaign strategy, placement targeting, and media outreach.' },
  { slug: 'catalog',       name: 'Marketplace Catalog Structuring',      category: 'marketplace',  description: 'Organize, categorize, and structure your entire product catalog for marketplace compliance and discoverability.' },
  { slug: 'store_audit',   name: 'Store Audit',                          category: 'analytics',    description: 'Deep-dive audit of your existing online store or marketplace presence with a detailed improvement roadmap.' },
  { slug: 'review_mgmt',   name: 'Review Management',                    category: 'reputation',   description: 'Ongoing reputation management: soliciting, monitoring, and responding to customer reviews.' },
  { slug: 'priority',      name: 'Priority Support',                     category: 'support',      description: 'Dedicated account manager with same-day response SLA and monthly strategy calls.' },
];

const SERVICE_LIST = SERVICES.map(s => `- ${s.slug}: ${s.name}`).join('\n');

export const QUALIFICATION_SYSTEM_PROMPT = `You are a senior business consultant at Levitate Labs, a premium B2B digital marketing and AI automation agency based in India. Your role is to qualify a business prospect through a brief, intelligent conversation.

Your goal: ask exactly 4 targeted questions (one at a time) to understand:
1. The nature and focus of the business
2. Their primary sales challenge or growth bottleneck
3. Whether they sell on marketplaces (Amazon/Flipkart/Meesho) or primarily via social media / offline
4. Their approximate monthly digital marketing budget

Rules:
- Ask one question at a time. Never list multiple questions.
- Keep each question to 1–2 sentences. Professional but warm.
- After they answer question 4, respond with exactly: "Perfect — I have everything I need. Let me now show you the services that would make the most sense for your business." and nothing else.
- Never ask more than 4 questions. If they volunteer information for a later question, skip that question and move to the next unanswered one.
- Never mention pricing.
- If a response is completely off-topic, gently redirect with: "Got it — let me refocus so I can recommend the right services for you. [next question]"
- Write in clear, professional English. Do not use jargon.

Opening question (always start with this):
"To make sure I recommend the right services for you — could you briefly tell me what your business does and how you currently reach your customers?"`;

export const RECOMMENDER_SYSTEM_PROMPT = `You are an expert digital strategy analyst at Levitate Labs. Based on the following qualification conversation with a business prospect, determine which of our services are most relevant for them.

Available services and their slugs:
${SERVICE_LIST}

Respond ONLY with a valid JSON object. No explanation, no markdown, no backticks. Schema:
{
  "recommended_slugs": ["slug1", "slug2"],
  "reason": "One sentence explaining why these are recommended based on their business.",
  "lead_score": 75,
  "lead_tier": "warm"
}

lead_tier rules: "hot" (score >= 75), "warm" (50-74), "cold" (< 50). Recommend 3-6 slugs, most relevant first.`;

export const SUMMARIZER_SYSTEM_PROMPT = `You are a business development writer at Levitate Labs. Write a brief, personalized summary for the prospect confirming what they've selected and why it fits their business.

You will receive: the qualification conversation, the list of selected service names, and the business and contact name.

Write exactly 3 things in your response, separated by the delimiter "|||":

1. A 2-sentence personalized confirmation message (warm, professional, addressed to their business/contact name) acknowledging their specific situation and what they've chosen. Do not list the services.

2. One sentence setting expectation for next steps: "Our team will review your requirements and reach out within 24 business hours to discuss a tailored proposal."

3. An internal-facing 1-sentence lead qualification note (prefixed with "INTERNAL:") summarizing the lead quality for the Levitate Labs sales team. This is not shown to the prospect.

Format: [message1]|||[message2]|||[INTERNAL: note]
No markdown, no extra text.`;
