import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/ui/JsonLd';
import ComparisonTable from '@/components/ComparisonTable';

export const metadata: Metadata = {
    title: 'LevitateOS vs Freshsales — All-in-One Business OS vs Pure CRM',
    description: 'Freshsales is a pure CRM. LevitateOS is a complete business operating system with website builder, AI agents, WhatsApp automation, and growth tools.',
    keywords: ['LevitateOS vs Freshsales', 'Freshsales alternative India', 'all-in-one business OS vs CRM', 'Freshworks CRM comparison', 'complete business automation'],
    openGraph: {
        title: 'LevitateOS vs Freshsales — Why All-in-One Wins',
        description: 'All-in-one with website builder vs pure CRM. 16 AI agents vs manual workflows.',
        type: 'article',
        images: [
            {
                url: 'https://levitatelabs.online/api/og?title=LevitateOS%20vs%20Freshsales&type=comparison',
                width: 1200,
                height: 630,
                alt: 'LevitateOS vs Freshsales Comparison',
            },
        ],
    },
};

const freshsalesFeatures = [
    { feature: 'Product Type', us: 'Pure CRM (sales focus)', lev: 'Complete business OS', usOk: false, levOk: true },
    { feature: 'Website Builder', us: 'Not included (separate Freshmarketer)', lev: '24-hour AI website deployment', usOk: false, levOk: true },
    { feature: 'WhatsApp Integration', us: 'Integration via Freshdesk (extra)', lev: 'Native, built into all workflows', usOk: false, levOk: true },
    { feature: 'AI Capabilities', us: 'Freddy AI (limited to CRM tasks)', lev: '16 AI agents (full business automation)', usOk: false, levOk: true },
    { feature: 'Lead Generation', us: 'Manual (import or form capture)', lev: 'Automated AI BizDev Agent', usOk: false, levOk: true },
    { feature: 'Pricing Model', us: 'Per-user USD ($15-69/user/mo)', lev: 'Flat INR (₹4,999-19,999/month)', usOk: false, levOk: true },
    { feature: 'Hinglish AI', us: 'English only', lev: 'Native Hinglish conversations', usOk: false, levOk: true },
    { feature: 'Proposal Generation', us: 'Not included', lev: 'Auto-generated branded PDFs', usOk: false, levOk: true },
    { feature: 'Invoice & Payments', us: 'Not included (separate Freshbooks)', lev: 'GST invoicing + automated chasing', usOk: false, levOk: true },
    { feature: 'Setup Time', us: '1-2 weeks (configuration)', lev: '2 minutes (instant activation)', usOk: false, levOk: true },
    { feature: 'GST Compliance', us: 'Not available (US product)', lev: 'Built-in GST, TDS, e-invoicing', usOk: false, levOk: true },
    { feature: 'Mobile Experience', us: 'Separate mobile app', lev: 'WhatsApp-native (no separate app)', usOk: false, levOk: true },
    { feature: 'Customer Support', us: 'Email + chat (business hours)', lev: 'WhatsApp + direct access (24/7)', usOk: false, levOk: true },
    { feature: 'Data Residency', us: 'US/EU servers', lev: 'India-based servers by default', usOk: false, levOk: true },
    { feature: 'Integrations Needed', us: 'Website, proposals, invoices, etc.', lev: 'Everything built-in (zero integrations)', usOk: false, levOk: true },
];

const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'What is the main difference between Freshsales and LevitateOS?',
            acceptedAnswer: { '@type': 'Answer', text: 'Freshsales is a pure CRM focused on sales pipeline management. LevitateOS is a complete business operating system that includes CRM plus 16 AI agents, website builder, proposal generator, GST invoicing, and WhatsApp automation—all in one platform.' },
        },
        {
            '@type': 'Question',
            name: 'How does pricing compare between Freshsales and LevitateOS?',
            acceptedAnswer: { '@type': 'Answer', text: 'Freshsales charges in USD per user: $15-69 per user per month. For a 10-person team, that is ₹12,450-57,270 monthly. LevitateOS charges a flat ₹4,999-19,999/month for your entire team regardless of size, with all features included.' },
        },
        {
            '@type': 'Question',
            name: 'Does Freshsales have a website builder?',
            acceptedAnswer: { '@type': 'Answer', text: 'No. Freshsales is a CRM only. You need to use Freshmarketer (separate product, separate cost) or a third-party website builder. LevitateOS includes AI-powered website deployment in 24 hours as part of every plan.' },
        },
        {
            '@type': 'Question',
            name: 'Can Freshsales automate WhatsApp conversations?',
            acceptedAnswer: { '@type': 'Answer', text: 'Freshsales requires integration with Freshdesk for WhatsApp, which adds cost and complexity. LevitateOS was built from day one as a WhatsApp-native platform where every feature works through WhatsApp by default.' },
        },
        {
            '@type': 'Question',
            name: 'Is Freshsales suitable for Indian GST compliance?',
            acceptedAnswer: { '@type': 'Answer', text: 'No. Freshsales is a US product built for US accounting rules. LevitateOS includes full Indian compliance built into the core platform: GST, TDS, e-way bills, and e-invoicing.' },
        },
    ],
};

export default function VsFreshsalesPage() {
    return (
        <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <JsonLd schema={faqSchema} />

            <section className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 sm:pt-32">
                <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                    <Link href="/compare" className="hover:text-[var(--gold-base)]">Comparisons</Link>
                    <span>/</span>
                    <span className="text-[var(--text-secondary)]">vs Freshsales</span>
                </div>
                <h1 className="font-headline text-[clamp(1.75rem,5vw,3rem)] leading-[1.1]">LevitateOS vs Freshsales</h1>
                <p className="mt-4 text-lg text-[var(--text-secondary)]">
                    All-in-one business OS with website builder vs pure CRM. 16 AI agents vs manual sales workflows.
                </p>
            </section>

            <article className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 prose prose-invert prose-sm max-w-none">
                <p>
                    Freshsales, part of the Freshworks suite, has positioned itself as a &ldquo;modern CRM&rdquo; that is &ldquo;intuitive and easy to use.&rdquo; And to be fair, it is a competent CRM. The user interface is clean, the learning curve is relatively gentle, and the Freddy AI provides some useful insights within the CRM context. But here is the problem: CRM is just one piece of running a business. If you choose Freshsales, you still need a website builder, a lead generation tool, a proposal generator, an invoicing system, a WhatsApp automation platform, and a customer support tool. That is 6+ separate tools, 6+ monthly subscriptions, and 6+ data silos.
                </p>
                <p>
                    LevitateOS takes a fundamentally different approach. We believe that modern Indian SMBs don&apos;t need &ldquo;the best CRM&rdquo;—they need a business operating system that handles everything from lead generation to payment collection. When you sign up for LevitateOS, you get a CRM (of course), but you also get a website builder that deploys in 24 hours, 16 AI agents that automate lead finding and outreach, automated proposal generation, GST-compliant invoicing, and WhatsApp-native customer engagement. One platform, one monthly fee, zero integrations needed.
                </p>
                <p>
                    Let us break down the pricing reality. Freshsales charges in USD per user per month: $15 for Growth, $39 for Pro, and $69 for Enterprise. At ₹83 per dollar, that is ₹1,245, ₹3,237, and ₹5,727 per user per month respectively. For a 12-person sales team on the Pro plan, you are paying ₹38,844 monthly just for CRM access. And remember—this doesn&apos;t include your website, your customer support, your marketing automation, or your invoicing. LevitateOS charges ₹9,999/month on the Growth plan for your entire organisation—whether you have 12 people or 50 people—with all features included.
                </p>
                <p>
                    The website builder gap is particularly significant. Freshsales is a CRM—it assumes you already have a website and want to capture leads from it. If you don&apos;t have a website (or your website is outdated), Freshsales cannot help you. You need to buy Freshmarketer or use a third-party website builder like Wix or WordPress, then integrate it with Freshsales. LevitateOS includes an AI-powered website builder that deploys a professional website in 24 hours. Just tell our AI what your business does, and it generates a complete website with pages, forms, SEO optimization, and WhatsApp integration—all automatically connected to your CRM.
                </p>
                <p>
                    WhatsApp integration highlights the architectural differences between the two platforms. Freshsales treats WhatsApp as an &ldquo;integration&rdquo;—you need to connect Freshdesk to WhatsApp Business API, configure the integration, and then you can send/receive messages. But it is not deeply integrated into the CRM workflows. You cannot, for example, automatically send a WhatsApp proposal when a deal reaches a certain stage. LevitateOS has WhatsApp as the core interface—every workflow, every automation, every AI agent operates through WhatsApp by default.
                </p>
                <p>
                    AI capabilities are where the gap becomes a chasm. Freshsales&apos;s Freddy AI is designed to help you use the CRM better—it suggests which leads to contact next, predicts deal closure probability, and identifies at-risk customers. That is genuinely useful, but it is reactive—it helps you do CRM tasks better. LevitateOS&apos;s 16 AI agents are proactive business operators. The BizDev Agent finds new leads while you sleep. The Outreach Agent sends personalised Hinglish messages to those leads. The Proposal Agent generates PDF proposals instantly. The Invoice Agent chases payments automatically. These are not &ldquo;CRM assistants&rdquo;—they are full-time AI employees working 24/7.
                </p>
                <p>
                    For Indian businesses, GST compliance is not optional—it is mandated by law. Freshsales, being a US product, has no concept of Indian GST, e-way bills, TDS deduction, or e-invoicing. If you use Freshsales, you need to export your deal data to Tally or Zoho Books for compliant invoicing. This creates data duplication, sync issues, and manual work. LevitateOS includes full Indian compliance: automatic GST calculation based on HSN/SAC codes, e-way bill generation for goods over ₹50,000, TDS deduction for vendors, and integration with digital signature platforms for e-invoicing mandates.
                </p>
                <p>
                    Setup time and onboarding reveal the product philosophy difference. Freshsales, like most traditional CRMs, requires 1-2 weeks of configuration: custom fields setup, pipeline stages design, workflow automation creation, team permissions configuration, and data import. LevitateOS is designed for instant gratification—scan a QR code with your WhatsApp Business app, and your entire business operating system is live in 2 minutes. No configuration, no customisation, no &ldquo;implementation&rdquo;—just instant business automation.
                </p>
                <p>
                    Language support is another critical differentiator for Indian businesses. Freshsales operates in English. Freddy AI responds in English. If your customers speak Hinglish (and 78% of Indian SMB customers do), Freshsales cannot engage with them naturally. LevitateOS&apos;s AI agents are trained on Indian conversational patterns—they understand &ldquo;Bhaiya rate kya hai?&rdquo; and respond appropriately in Hinglish. We support Hindi, Gujarati, Tamil, Telugu, and other regional languages out of the box.
                </p>
                <p>
                    If you are currently evaluating Freshsales, ask yourself this: do I want the best CRM, or do I want the best business operating system? If your answer is the latter, LevitateOS is the clear choice. You will save lakhs in annual software costs, eliminate 6+ data silos, and have AI agents working for your business 24/7.
                </p>
            </article>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="mb-6 text-xl font-semibold">Feature-by-Feature Comparison</h2>
                <ComparisonTable
                    platformA={{ name: 'Freshsales', color: 'text-[var(--text-tertiary)]', features: freshsalesFeatures }}
                    platformB={{ name: 'LevitateOS', color: 'text-[var(--gold-base)]', features: freshsalesFeatures }}
                    intro="Freshsales is a pure CRM. LevitateOS is everything your business needs."
                />
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="mb-6 text-xl font-semibold">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">What is the main difference between Freshsales and LevitateOS?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">Freshsales is a pure CRM focused on sales pipeline. LevitateOS is a complete business OS with CRM, 16 AI agents, website builder, proposal generator, GST invoicing, and WhatsApp automation—all in one platform.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">How does pricing compare between Freshsales and LevitateOS?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">Freshsales charges $15-69 per user/month in USD. For 10 users, that is ₹12,450-57,270 monthly. LevitateOS charges flat ₹4,999-19,999/month for your entire team with all features included.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Does Freshsales have a website builder?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">No. Freshsales is CRM only. You need Freshmarketer (separate cost) or third-party builder. LevitateOS includes AI-powered website deployment in 24 hours on all plans.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Can Freshsales automate WhatsApp conversations?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">It requires Freshdesk integration with added cost/complexity. LevitateOS is WhatsApp-native—every feature works through WhatsApp by default.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Is Freshsales suitable for Indian GST compliance?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">No. Freshsales is a US product without Indian compliance. LevitateOS includes full GST, TDS, e-way bills, and e-invoicing built-in.</p>
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
                    <Link href="/compare/vs-wati" className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 hover:border-[var(--gold-base)] transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--gold-base)]">vs WATI</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">Full OS vs WhatsApp-only tool</p>
                    </Link>
                </div>
                <div className="mt-4">
                    <Link href="/onboard" className="rounded-[14px] border border-[var(--gold-base)] bg-[var(--gold-base)]/10 p-4 block hover:bg-[var(--gold-base)]/20 transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--gold-base)]">Get the all-in-one advantage — Start with LevitateOS</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">Complete business OS with 16 AI agents. 2-minute setup.</p>
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
