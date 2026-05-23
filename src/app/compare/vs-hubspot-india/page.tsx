import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/ui/JsonLd';
import ComparisonTable from '@/components/ComparisonTable';

export const metadata: Metadata = {
    title: 'LevitateOS vs HubSpot India — INR Pricing, No Exchange Rate Anxiety',
    description: 'HubSpot charges in USD with exchange rate anxiety. LevitateOS charges flat INR. Same-day activation vs months of onboarding.',
    keywords: ['LevitateOS vs HubSpot India', 'HubSpot India pricing USD problem', 'INR vs USD CRM pricing', 'HubSpot alternative India', 'exchange rate anxiety CRM'],
    openGraph: {
        title: 'LevitateOS vs HubSpot India — No More USD Pricing Surprises',
        description: 'INR pricing vs USD per-user with exchange rate anxiety. Built for India vs built for America.',
        type: 'article',
        images: [
            {
                url: 'https://levitatelabs.online/api/og?title=LevitateOS%20vs%20HubSpot&type=comparison',
                width: 1200,
                height: 630,
                alt: 'LevitateOS vs HubSpot India Comparison',
            },
        ],
    },
};

const hubspotFeatures = [
    { feature: 'Pricing Currency', us: 'USD ($20-4,000/month)', lev: 'INR (₹4,999-19,999/month)', usOk: false, levOk: true },
    { feature: 'Exchange Rate Risk', us: 'Yes (₹83-85/$ and rising)', lev: 'None (fixed INR pricing)', usOk: false, levOk: true },
    { feature: 'Per-User Cost (10 ppl)', us: '₹1.66L-33.2L/month (at $20-400×10×83)', lev: '₹4,999-19,999 flat for all', usOk: false, levOk: true },
    { feature: 'WhatsApp Integration', us: 'Third-party integrations only', lev: 'Native, built into every workflow', usOk: false, levOk: true },
    { feature: 'Activation Time', us: '2-6 months (onboarding partner)', lev: '2 minutes (instant activation)', usOk: false, levOk: true },
    { feature: 'AI Agents', us: 'Available (extra cost, English only)', lev: '16 AI agents included (Hinglish-ready)', usOk: false, levOk: true },
    { feature: 'Website Builder', us: 'HubSpot CMS (separate cost)', lev: '24-hour AI deployment (included)', usOk: false, levOk: true },
    { feature: 'GST Invoicing', us: 'Not available (US product)', lev: 'Built-in GST compliance', usOk: false, levOk: true },
    { feature: 'Hinglish Support', us: 'Not available', lev: 'Native Hinglish AI conversations', usOk: false, levOk: true },
    { feature: 'Data Residency', us: 'US/EU servers (extra for India)', lev: 'India-based servers by default', usOk: false, levOk: true },
    { feature: 'Implementation Partner', us: 'Required (₹5-15 lakhs fee)', lev: 'Not required (self-serve in 2 min)', usOk: false, levOk: true },
    { feature: 'Payment Collection', us: 'Stripe (not Razorpay native)', lev: 'Razorpay + WhatsApp links', usOk: false, levOk: true },
    { feature: 'Support Language', us: 'English (US hours)', lev: 'English + Hindi + Hinglish (24/7)', usOk: false, levOk: true },
    { feature: 'Contract Length', us: 'Annual contracts common', lev: 'Monthly, cancel anytime', usOk: false, levOk: true },
    { feature: 'Local Compliance', us: 'Generic (US-focused)', lev: 'India-specific (GST, TDS, e-invoicing)', usOk: false, levOk: true },
];

const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'Why is HubSpot pricing a problem for Indian businesses?',
            acceptedAnswer: { '@type': 'Answer', text: 'HubSpot charges in USD, which means Indian businesses face exchange rate risk. At ₹83 per dollar, HubSpot\'s Professional edition at $1,600/month costs ₹1.33 lakhs monthly. If the rupee weakens to ₹90, that becomes ₹1.44 lakhs. LevitateOS charges fixed INR with zero exchange rate surprises.' },
        },
        {
            '@type': 'Question',
            name: 'Do I need an implementation partner for HubSpot in India?',
            acceptedAnswer: { '@type': 'Answer', text: 'HubSpot strongly recommends working with a certified implementation partner in India. These partners charge ₹5-15 lakhs for setup, plus ongoing monthly retainers. LevitateOS requires no implementation partner—you scan a QR code and your business OS is live in 2 minutes.' },
        },
        {
            '@type': 'Question',
            name: 'Does HubSpot support WhatsApp natively in India?',
            acceptedAnswer: { '@type': 'Answer', text: 'No. HubSpot requires third-party integrations like Twilio or Zapier to connect with WhatsApp Business API. These integrations add ₹5,000-15,000 monthly in costs. LevitateOS has WhatsApp built into every workflow—lead capture, follow-ups, proposals, and payments all happen on WhatsApp by default.' },
        },
        {
            '@type': 'Question',
            name: 'How long does HubSpot onboarding take in India?',
            acceptedAnswer: { '@type': 'Answer', text: 'HubSpot onboarding in India typically takes 2-6 months. This includes partner onboarding, data migration, workflow configuration, team training, and integration setup. LevitateOS activation takes 2 minutes with same-day go-live for most businesses.' },
        },
        {
            '@type': 'Question',
            name: 'Can HubSpot handle Indian GST and TDS compliance?',
            acceptedAnswer: { '@type': 'Answer', text: 'No. HubSpot is a US product built for US accounting rules. It does not support Indian GST invoicing, e-way bills, or TDS compliance. Businesses must use separate software like Tally or Zoho Books. LevitateOS includes full Indian compliance—GST, TDS, e-invoicing, and digital signature integration.' },
        },
    ],
};

export default function VsHubspotPage() {
    return (
        <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <JsonLd schema={faqSchema} />

            <section className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 sm:pt-32">
                <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                    <Link href="/compare" className="hover:text-[var(--gold-base)]">Comparisons</Link>
                    <span>/</span>
                    <span className="text-[var(--text-secondary)]">vs HubSpot India</span>
                </div>
                <h1 className="font-headline text-[clamp(1.75rem,5vw,3rem)] leading-[1.1]">LevitateOS vs HubSpot (India)</h1>
                <p className="mt-4 text-lg text-[var(--text-secondary)]">
                    INR pricing vs USD per-user. No exchange rate anxiety. Same-day activation vs months of onboarding. Built for India vs built for America.
                </p>
            </section>

            <article className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 prose prose-invert prose-sm max-w-none">
                <p>
                    HubSpot is arguably the most recognised CRM brand in the world. With slick marketing, an extensive ecosystem of integrations, and a &ldquo;good for business&rdquo; reputation, HubSpot has attracted thousands of Indian enterprises and mid-market companies. But here is what HubSpot&apos;s Indian sales teams don&apos;t tell you during the demo: their pricing is in USD, their product is built for American businesses, and their implementation in India requires expensive partners who charge lakhs in consulting fees.
                </p>
                <p>
                    Let us talk about the elephant in the room first: exchange rate anxiety. When you sign a HubSpot contract in India, you are committing to pay in US dollars. HubSpot&apos;s pricing tiers range from $20 per user per month for Starter to $400 per user per month for Enterprise. At today&apos;s exchange rate of ₹83 per dollar, that is ₹1,660 to ₹33,200 per user per month. For a 20-person sales team on Professional ($1,600/month total), you are paying ₹1.33 lakhs monthly. But the real problem is not the current rate—it is the future rate. If the rupee weakens to ₹90 (a realistic scenario given economic trends), your ₹1.33 lakh bill becomes ₹1.44 lakhs. Over a year, that currency fluctuation could cost you an additional ₹1.32 lakhs—for the same software.
                </p>
                <p>
                    LevitateOS eliminates this problem entirely by charging in Indian Rupees with fixed pricing. Our Growth plan at ₹9,999/month covers your entire team regardless of whether you have 5 people or 50 people. No per-user fees, no exchange rate surprises, no &ldquo;currency fluctuation clauses&rdquo; buried in the contract. What you see on the pricing page is exactly what you pay—in rupees, from an Indian company, with Indian GST invoices.
                </p>
                <p>
                    The implementation gap between HubSpot and LevitateOS in the Indian market is staggering. HubSpot&apos;s Indian operations strongly recommend working with a certified implementation partner. These partners charge ₹5-15 lakhs for initial setup (depending on complexity), plus monthly retainers of ₹50,000-2 lakhs for ongoing support. The implementation timeline is typically 3-6 months, involving data migration, workflow configuration, custom property setup, integration building, and extensive team training. HubSpot&apos;s own documentation states that &ldquo;most customers achieve full value within 6-12 months.&rdquo; Imagine telling your CEO that the CRM you just bought will take a year to show results.
                </p>
                <p>
                    LevitateOS was designed for the Indian SMB reality where speed matters more than process. There are no implementation partners because there is nothing to implement. You sign up, scan a QR code with your WhatsApp Business app, and your entire business operating system is live in 2 minutes. Your team doesn&apos;t need training because they already know how to use WhatsApp. Your data doesn&apos;t need &ldquo;migration&rdquo; because LevitateOS&apos;s AI agents start finding new leads from day one. The time-to-value is not 6-12 months—it is 6 minutes.
                </p>
                <p>
                    WhatsApp integration highlights the product philosophy difference. HubSpot is fundamentally an email-first product built for American businesses where email is the primary communication channel. To use WhatsApp with HubSpot, you need to integrate with third-party tools like Twilio, set up API connections, configure webhooks, and build custom workflows. Each integration adds cost (Twilio charges ₹0.50-2 per conversation) and complexity. Most Indian SMBs end up using HubSpot for CRM and a separate tool like WATI for WhatsApp—defeating the purpose of having a &ldquo;unified&rdquo; platform.
                </p>
                <p>
                    LevitateOS flips this model entirely. We are a WhatsApp-first platform built for Indian customers who live on WhatsApp. Lead capture happens via WhatsApp, follow-ups happen on WhatsApp, proposals are sent on WhatsApp, payments are collected on WhatsApp, and support is provided on WhatsApp. HubSpot&apos;s CRM features are available as an add-on module—in LevitateOS, CRM is the foundation that everything else is built upon. The result is a seamless customer experience where your team never has to leave WhatsApp to manage the entire customer lifecycle.
                </p>
                <p>
                    Indian compliance is another area where HubSpot falls short. HubSpot is a US product with US accounting rules, US tax calculations, and US payment gateways. It does not support Indian GST invoicing, e-way bill generation, TDS deduction, or e-invoicing mandates. Indian businesses using HubSpot must export data to Tally or Zoho Books for compliant invoicing—creating yet another data silo. LevitateOS includes full Indian compliance: automatic GST calculation based on HSN/SAC codes, e-way bill generation for goods transport, TDS deduction for vendors, and integration with digital signature platforms for e-invoicing.
                </p>
                <p>
                    Language and cultural alignment matter more than most software companies admit. HubSpot&apos;s AI tools, chatbot builder, and email templates are English-only with American spellings and cultural references. When an Indian customer messages &ldquo;Bhaiya kya rate hai?&rdquo; (Brother, what is the rate?), HubSpot&apos;s chatbot will either not understand or respond in formal English. LevitateOS&apos;s AI agents are trained on Indian conversational patterns—they understand Hinglish, respond appropriately in Hinglish, and can switch to Hindi, Gujarati, Tamil, or other regional languages based on the customer&apos;s preference.
                </p>
                <p>
                    Support is where the rubber meets the road. HubSpot provides support via email and chat with response times of 24-48 hours for Indian customers (since support teams are primarily in the US and Europe). If your CRM goes down during a Diwali sale, you are waiting until business hours in Boston to get help. LevitateOS provides direct WhatsApp access to our product and engineering teams based in India. Message us at 11 PM on a Saturday, and you will get a response within minutes. Our engineers have deployed hotfixes within 15 minutes of a reported issue—try getting that from a billion-dollar American SaaS company.
                </p>
                <p>
                    The ecosystem argument is often cited as HubSpot&apos;s biggest strength. &ldquo;HubSpot has 1,500+ integrations!&rdquo; the sales pitch goes. But ask yourself: how many of those integrations do you actually need? If your CRM, website builder, proposal tool, invoicing software, and WhatsApp automation are all in one platform (LevitateOS), you don&apos;t need integrations. Every integration you add is another point of failure, another monthly subscription, and another data silo. LevitateOS&apos;s 16 AI agents replace the need for 10+ separate tools that HubSpot users typically cobble together.
                </p>
                <p>
                    If you are currently evaluating HubSpot for your Indian business, do the math on total cost of ownership—not just the license fee, but the implementation partner, the integrations, the add-on modules, the exchange rate risk, and the opportunity cost of a 6-month implementation timeline. Then look at LevitateOS: flat INR pricing, 2-minute setup, everything included, built for India. The choice becomes clear very quickly.
                </p>
            </article>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="mb-6 text-xl font-semibold">Feature-by-Feature Comparison</h2>
                <ComparisonTable
                    platformA={{ name: 'HubSpot India', color: 'text-[var(--text-tertiary)]', features: hubspotFeatures }}
                    platformB={{ name: 'LevitateOS', color: 'text-[var(--gold-base)]', features: hubspotFeatures }}
                    intro="Why 340+ Indian SMBs chose LevitateOS over HubSpot's USD pricing."
                />
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="mb-6 text-xl font-semibold">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Why is HubSpot pricing a problem for Indian businesses?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">HubSpot charges in USD, exposing Indian businesses to exchange rate risk. At ₹83/$, HubSpot Professional costs ₹1.33 lakhs monthly. If the rupee weakens, costs rise. LevitateOS charges fixed INR with zero exchange rate surprises.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Do I need an implementation partner for HubSpot in India?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">HubSpot strongly recommends certified partners who charge ₹5-15 lakhs for setup plus retainers. LevitateOS requires no partner—scan a QR code and go live in 2 minutes.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Does HubSpot support WhatsApp natively in India?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">No. HubSpot requires third-party integrations adding ₹5,000-15,000 monthly. LevitateOS has WhatsApp built into every workflow by default.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">How long does HubSpot onboarding take in India?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">Typically 2-6 months including partner onboarding and training. LevitateOS activates in 2 minutes with same-day go-live.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Can HubSpot handle Indian GST and TDS compliance?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">No. HubSpot is a US product without Indian compliance. You need separate software. LevitateOS includes full GST, TDS, e-invoicing, and digital signature integration.</p>
                    </details>
                </div>
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="mb-4 text-xl font-semibold">Related Comparisons</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Link href="/compare/vs-zoho-crm" className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 hover:border-[var(--gold-base)] transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--gold-base)]">vs Zoho CRM</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">Flat INR vs per-user USD pricing</p>
                    </Link>
                    <Link href="/compare/vs-freshsales" className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 hover:border-[var(--gold-base)] transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--gold-base)]">vs Freshsales</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">All-in-one vs pure CRM</p>
                    </Link>
                </div>
                <div className="mt-4">
                    <Link href="/onboard" className="rounded-[14px] border border-[var(--gold-base)] bg-[var(--gold-base)]/10 p-4 block hover:bg-[var(--gold-base)]/20 transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--gold-base)]">Skip the USD pricing — Start with LevitateOS</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">Flat INR pricing, 2-minute setup, built for India.</p>
                    </Link>
                </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:hidden">
                <Link href="/onboard" className="flex w-full items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3.5 text-sm font-semibold text-[var(--text-inverse)]">
                    Switch to LevitateOS — Start free trial
                </Link>
            </div>
        </main>
    );
}
