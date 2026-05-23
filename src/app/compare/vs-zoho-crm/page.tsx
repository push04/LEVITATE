import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/ui/JsonLd';
import ComparisonTable from '@/components/ComparisonTable';

export const metadata: Metadata = {
    title: 'LevitateOS vs Zoho CRM — Flat INR Pricing vs Per-User USD',
    description: 'Discover why Indian SMBs are switching from Zoho CRM to LevitateOS. Flat INR pricing, WhatsApp-native features, and instant 2-minute setup vs weeks of configuration.',
    keywords: ['LevitateOS vs Zoho CRM', 'Zoho CRM alternative India', 'flat INR pricing CRM', 'WhatsApp native CRM', 'Indian SMB CRM comparison'],
    openGraph: {
        title: 'LevitateOS vs Zoho CRM — Better for Indian Businesses?',
        description: 'Flat INR pricing vs per-user USD. WhatsApp-native vs addon. Instant setup vs weeks of configuration.',
        type: 'article',
        images: [
            {
                url: 'https://levitatelabs.online/api/og?title=LevitateOS%20vs%20Zoho%20CRM&type=comparison',
                width: 1200,
                height: 630,
                alt: 'LevitateOS vs Zoho CRM Comparison',
            },
        ],
    },
};

const zohoFeatures = [
    { feature: 'Pricing Model', us: 'Per-user USD ($14-40/user/month)', lev: 'Flat INR (₹4,999-19,999/month total)', usOk: false, levOk: true },
    { feature: 'WhatsApp Integration', us: 'Addon module (extra ₹2,500+/mo)', lev: 'Native, built-in, no extra cost', usOk: false, levOk: true },
    { feature: 'Setup Time', us: 'Weeks of configuration & training', lev: '2 minutes, instant activation', usOk: false, levOk: true },
    { feature: 'AI Lead Finding', us: 'Manual research required', lev: 'Automated BizDev Agent finds leads', usOk: false, levOk: true },
    { feature: 'Hinglish AI Outreach', us: 'Not available (English only)', lev: 'Automated Hinglish messages', usOk: false, levOk: true },
    { feature: 'Website Builder', us: 'Not included (separate Zoho Sites)', lev: '24-hour AI website deployment', usOk: false, levOk: true },
    { feature: 'Proposal Generation', us: 'Manual creation in Writer', lev: 'Auto-generated branded PDFs', usOk: false, levOk: true },
    { feature: 'Invoice Chasing', us: 'Manual follow-ups via CRM', lev: 'Automated WhatsApp reminders', usOk: false, levOk: true },
    { feature: 'Payment Collection', us: 'Razorpay integration needed', lev: 'WhatsApp payment links built-in', usOk: false, levOk: true },
    { feature: 'Customer Support', us: 'Email + ticket system (24hr SLA)', lev: 'WhatsApp + direct access (instant)', usOk: false, levOk: true },
    { feature: 'Bilingual Interface', us: 'English + Hindi (limited)', lev: 'English + Hindi + Hinglish + Gujarati', usOk: false, levOk: true },
    { feature: 'GST Invoicing', us: 'Available (separate Zoho Books)', lev: 'Built-in GST compliance', usOk: false, levOk: true },
    { feature: 'Mobile App', us: 'Full-featured but complex', lev: 'Lightweight, focused on WhatsApp', usOk: false, levOk: true },
    { feature: 'Data Residency', us: 'US/EU servers (data localisation extra)', lev: 'India-based servers included', usOk: false, levOk: true },
    { feature: 'Onboarding Help', us: 'Paid consultant or self-serve docs', lev: 'Free WhatsApp-guided onboarding', usOk: false, levOk: true },
];

const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'Why is Zoho CRM pricing a problem for Indian SMBs?',
            acceptedAnswer: { '@type': 'Answer', text: 'Zoho charges in USD per user. At current exchange rates, $14-40 per user per month becomes ₹1,200-3,400 per user. For a 10-person team, that is ₹12,000-34,000 monthly. LevitateOS charges flat ₹4,999-19,999 for your entire team regardless of size.' },
        },
        {
            '@type': 'Question',
            name: 'Is WhatsApp integration really native in LevitateOS?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. LevitateOS was built from day one as a WhatsApp-first platform. Every feature—lead capture, follow-ups, proposals, payments, support—works through WhatsApp. Zoho requires you to buy their WhatsApp addon module separately and configure it.' },
        },
        {
            '@type': 'Question',
            name: 'How long does LevitateOS setup actually take?',
            acceptedAnswer: { '@type': 'Answer', text: 'Setup takes exactly 2 minutes. You sign up, connect your WhatsApp Business number via QR code, and your CRM is live. Zoho CRM typically requires 2-4 weeks of configuration, module setup, workflow design, and team training before it is usable.' },
        },
        {
            '@type': 'Question',
            name: 'Can LevitateOS handle the same volume as Zoho CRM?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes. LevitateOS handles unlimited contacts, deals, and WhatsApp conversations on all plans. Zoho limits you based on edition—Basic allows 100,000 records while Enterprise allows 500,000. LevitateOS has no such artificial limits.' },
        },
        {
            '@type': 'Question',
            name: 'What happens to my existing Zoho CRM data?',
            acceptedAnswer: { '@type': 'Answer', text: 'LevitateOS provides free data migration assistance for all paid plans. Our team exports your Zoho data, maps the fields to LevitateOS, and imports everything via WhatsApp-guided process. Most migrations complete within 48 hours.' },
        },
    ],
};

export default function VsZohoPage() {
    return (
        <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <JsonLd schema={faqSchema} />

            <section className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 sm:pt-32">
                <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                    <Link href="/compare" className="hover:text-[var(--gold-base)]">Comparisons</Link>
                    <span>/</span>
                    <span className="text-[var(--text-secondary)]">vs Zoho CRM</span>
                </div>
                <h1 className="font-headline text-[clamp(1.75rem,5vw,3rem)] leading-[1.1]">LevitateOS vs Zoho CRM</h1>
                <p className="mt-4 text-lg text-[var(--text-secondary)]">
                    Flat INR pricing vs per-user USD. WhatsApp-native vs addon. Instant 2-minute setup vs weeks of configuration hell.
                </p>
            </section>

            <article className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 prose prose-invert prose-sm max-w-none">
                <p>
                    For years, Zoho CRM has been the default choice for Indian small and medium businesses looking for an affordable CRM solution. With aggressive marketing and a &ldquo;Made in India&rdquo; brand story, Zoho captured the imagination of thousands of Indian entrepreneurs. However, as businesses grow and customer expectations shift toward instant WhatsApp communication, the cracks in Zoho&apos;s approach have become impossible to ignore. Today, a new generation of Indian SMBs is asking a different question: why am I paying in dollars for software that doesn&apos;t even speak my customers&apos; language?
                </p>
                <p>
                    The fundamental problem with Zoho CRM is not that it is a bad product—it is that it was built for a different era. Zoho CRM was designed in the early 2000s when email was the primary communication channel and &ldquo;CRM&rdquo; meant a database of contacts with a pipeline view. Fast forward to 2026, and 78% of Indian customers prefer WhatsApp for business communication. They expect instant replies, Hinglish conversations, payment links in chat, and proposal PDFs delivered within minutes. Zoho CRM, even with its WhatsApp addon module, simply was not architected for this reality.
                </p>
                <p>
                    Let us start with the elephant in the room: pricing. Zoho advertises &ldquo;affordable CRM starting at $14/user/month.&rdquo; What they don&apos;t highlight is that this is in US dollars. At an exchange rate of ₹83 per dollar, that &ldquo;affordable&rdquo; $14 becomes ₹1,162 per user per month. For a small team of 8 people, you are paying ₹9,296 monthly just for basic CRM access. Move up to the Professional edition at $23/user/month, and your 8-person team costs ₹15,272 monthly. The Enterprise edition at $40/user/month pushes a 10-person team to ₹33,200 per month. And this is before you add the WhatsApp module at an additional ₹2,500+ per month, the Books module for invoicing, and the Sites module for websites.
                </p>
                <p>
                    LevitateOS takes a radically different approach. We charge in Indian Rupees, and we charge a flat fee for your entire organisation—not per user. Our Starter plan at ₹4,999/month covers your whole team, whether you have 2 people or 20 people. Our Growth plan at ₹9,999/month and Pro plan at ₹19,999/month similarly cover unlimited team members. This means as you hire more sales reps, your CRM cost does not increase. For a 15-person sales team, Zoho Enterprise would cost ₹49,800 monthly, while LevitateOS Pro costs ₹19,999—a 60% saving.
                </p>
                <p>
                    Beyond pricing, the architectural difference between the two platforms is profound. Zoho CRM is a traditional multi-module SaaS product. You buy the CRM module, then add the WhatsApp module, then add the Books module for invoicing, then add the Sites module for websites, then add the Campaigns module for marketing. Each module has its own interface, its own learning curve, and its own integration challenges. Data often gets siloed between modules, requiring custom workflows or third-party tools like Zapier to bridge the gaps.
                </p>
                <p>
                    LevitateOS is built as a unified business operating system where WhatsApp is not an &ldquo;integration&rdquo;—it is the primary interface. When a lead messages you on WhatsApp, LevitateOS automatically captures their details, enriches their profile with business data, scores their intent, and begins a personalised nurturing sequence—all without any manual configuration. The AI BizDev Agent continuously finds new leads matching your ideal customer profile and initiates WhatsApp conversations in natural Hinglish. Your team doesn&apos;t need to &ldquo;check the CRM&rdquo; because the CRM lives inside the communication channel they already use all day.
                </p>
                <p>
                    Setup time is another critical differentiator. Zoho CRM implementations typically take 2-4 weeks. You need to configure modules, set up custom fields, design workflows, import data, set permissions, configure the WhatsApp addon, integrate with your website, and train your team. Even Zoho&apos;s own documentation suggests working with a certified partner for implementation. LevitateOS is designed for instant gratification: sign up, scan a QR code to connect your WhatsApp Business number, and you are live in 2 minutes. No modules to configure, no workflows to design, no training required—if your team knows how to use WhatsApp, they already know how to use LevitateOS.
                </p>
                <p>
                    For Indian businesses, language support is not a luxury—it is a necessity. Zoho CRM offers an English interface with limited Hindi translation. LevitateOS supports English, Hindi, Hinglish (the mixed language your customers actually speak), Gujarati, and other regional languages. Our AI agents automatically detect the language of incoming messages and respond appropriately. A customer messaging in Hindi gets a Hindi response. A customer using Hinglish gets a Hinglish response. This cultural alignment builds trust in ways that Zoho&apos;s English-only AI can never achieve.
                </p>
                <p>
                    Data residency and compliance are increasingly important for Indian businesses. Zoho stores data on AWS servers primarily in the US and Europe, with Indian data residency available only on higher-tier plans with additional compliance costs. LevitateOS stores all Indian customer data on Indian servers by default, ensuring compliance with data localisation norms. Our GST invoicing is built into the core platform—not a separate &ldquo;Books&rdquo; module—with automatic GST calculation, e-way bill generation, and TDS compliance.
                </p>
                <p>
                    Perhaps the most compelling reason to switch is what happens after you become a customer. Zoho support operates on a ticket-based system with 24-hour response SLAs for lower tiers. You submit a ticket, wait for an email response, and hope the issue gets resolved. LevitateOS provides direct WhatsApp access to our product and engineering teams. You message us on WhatsApp with an issue, and you get an immediate response—often with the fix deployed while you are still on the chat. This support model alone has driven a 94% retention rate among our customers.
                </p>
                <p>
                    If you are currently on Zoho CRM and wondering whether the switch is worth it, consider this: the average LevitateOS customer saves ₹2.4 lakhs annually on CRM costs while closing 37% more deals through WhatsApp automation. The migration takes 48 hours with our free data migration service, and you can be live on LevitateOS while still running Zoho in parallel during the transition. There is no risk, only upside.
                </p>
            </article>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="mb-6 text-xl font-semibold">Feature-by-Feature Comparison</h2>
                <ComparisonTable
                    platformA={{ name: 'Zoho CRM', color: 'text-[var(--text-tertiary)]', features: zohoFeatures }}
                    platformB={{ name: 'LevitateOS', color: 'text-[var(--gold-base)]', features: zohoFeatures }}
                    intro="Detailed comparison across 15 critical dimensions for Indian SMBs."
                />
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="mb-6 text-xl font-semibold">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Why is Zoho CRM pricing a problem for Indian SMBs?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">Zoho charges in USD per user. At current exchange rates, $14-40 per user per month becomes ₹1,200-3,400 per user. For a 10-person team, that is ₹12,000-34,000 monthly. LevitateOS charges flat ₹4,999-19,999 for your entire team regardless of size.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Is WhatsApp integration really native in LevitateOS?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">Yes. LevitateOS was built from day one as a WhatsApp-first platform. Every feature—lead capture, follow-ups, proposals, payments, support—works through WhatsApp. Zoho requires you to buy their WhatsApp addon module separately and configure it.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">How long does LevitateOS setup actually take?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">Setup takes exactly 2 minutes. You sign up, connect your WhatsApp Business number via QR code, and your CRM is live. Zoho CRM typically requires 2-4 weeks of configuration, module setup, workflow design, and team training before it is usable.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Can LevitateOS handle the same volume as Zoho CRM?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">Yes. LevitateOS handles unlimited contacts, deals, and WhatsApp conversations on all plans. Zoho limits you based on edition—Basic allows 100,000 records while Enterprise allows 500,000. LevitateOS has no such artificial limits.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">What happens to my existing Zoho CRM data?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">LevitateOS provides free data migration assistance for all paid plans. Our team exports your Zoho data, maps the fields to LevitateOS, and imports everything via WhatsApp-guided process. Most migrations complete within 48 hours.</p>
                    </details>
                </div>
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="mb-4 text-xl font-semibold">Related Comparisons</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Link href="/compare/vs-hubspot-india" className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 hover:border-[var(--gold-base)] transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--gold-base)]">vs HubSpot India</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">INR vs USD pricing with exchange rate anxiety</p>
                    </Link>
                    <Link href="/compare/vs-freshsales" className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 hover:border-[var(--gold-base)] transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--gold-base)]">vs Freshsales</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">All-in-one with website builder vs pure CRM</p>
                    </Link>
                </div>
                <div className="mt-4">
                    <Link href="/onboard" className="rounded-[14px] border border-[var(--gold-base)] bg-[var(--gold-base)]/10 p-4 block hover:bg-[var(--gold-base)]/20 transition-colors">
                        <h3 className="text-sm font-semibold text-[var(--gold-base)]">Ready to switch? Start with LevitateOS</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">Join 2,400+ Indian businesses. Flat INR pricing, instant setup.</p>
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
