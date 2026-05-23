import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/ui/JsonLd';
import ComparisonTable from '@/components/ComparisonTable';

export const metadata: Metadata = {
    title: 'LevitateOS vs WATI — Full Business OS vs WhatsApp Tool',
    description: 'WATI is a WhatsApp messaging tool. LevitateOS is a complete business operating system with AI agents, CRM, website builder, and automated growth.',
    keywords: ['LevitateOS vs WATI', 'WATI alternative', 'WhatsApp business tool comparison', 'business OS vs messaging tool', 'complete business automation platform'],
    openGraph: {
        title: 'LevitateOS vs WATI — Complete Business OS vs WhatsApp-Only Tool',
        description: 'What you get beyond messaging. LevitateOS is a complete business automation platform with 16 AI agents.',
        type: 'article',
        images: [
            {
                url: 'https://levitatelabs.online/api/og?title=LevitateOS%20vs%20WATI&type=comparison',
                width: 1200,
                height: 630,
                alt: 'LevitateOS vs WATI Comparison',
            },
        ],
    },
};

const watiFeatures = [
    { feature: 'Core Product', us: 'WhatsApp Business API tool', lev: 'Full business operating system', usOk: false, levOk: true },
    { feature: 'Number of AI Agents', us: '0 (manual configuration)', lev: '16 AI agents (BizDev, Outreach, etc.)', usOk: false, levOk: true },
    { feature: 'Lead Generation', us: 'No (you bring your own leads)', lev: 'AI finds leads automatically', usOk: false, levOk: true },
    { feature: 'CRM Pipeline', us: 'Basic chat inbox only', lev: 'Full CRM with deals, stages, analytics', usOk: false, levOk: true },
    { feature: 'Website Builder', us: 'Not included', lev: '24-hour AI website deployment', usOk: false, levOk: true },
    { feature: 'Proposal Generation', us: 'Not included', lev: 'Auto-generated branded PDF proposals', usOk: false, levOk: true },
    { feature: 'Invoice & Payments', us: 'Basic payment links only', lev: 'GST invoicing + automated chasing', usOk: false, levOk: true },
    { feature: 'Team Collaboration', us: 'Chat assignment only', lev: 'Full project management + tasks', usOk: false, levOk: true },
    { feature: 'Pricing Model', us: 'Per-conversation + platform fees', lev: 'Flat monthly INR (no conversation caps)', usOk: false, levOk: true },
    { feature: 'Onboarding Time', us: '3-5 days (API setup required)', lev: '2 minutes (QR code scan)', usOk: false, levOk: true },
    { feature: 'Hinglish AI', us: 'English templates only', lev: 'Native Hinglish AI conversations', usOk: false, levOk: true },
    { feature: 'Customer Support', us: 'Email + chat (business hours)', lev: 'WhatsApp + direct access (24/7)', usOk: false, levOk: true },
    { feature: 'Data & Analytics', us: 'Basic chat metrics', lev: 'Full business intelligence dashboard', usOk: false, levOk: true },
    { feature: 'Integrations Needed', us: 'CRM, website, proposals, etc.', lev: 'Everything built-in (zero integrations)', usOk: false, levOk: true },
    { feature: 'Mobile Experience', us: 'Mobile web app', lev: 'WhatsApp-native (no separate app)', usOk: false, levOk: true },
];

const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'What is the core difference between WATI and LevitateOS?',
            acceptedAnswer: { '@type': 'Answer', text: 'WATI is a WhatsApp Business API tool that helps you send messages and manage chats. It does not include lead generation, CRM, website building, proposal generation, or business intelligence. LevitateOS is a complete business operating system that includes all of these plus WhatsApp automation. With WATI, you still need 5-6 other tools. With LevitateOS, you need nothing else.' },
        },
        {
            '@type': 'Question',
            name: 'Does WATI have AI lead generation like LevitateOS?',
            acceptedAnswer: { '@type': 'Answer', text: 'No. WATI is a passive tool—you must bring your own leads and configure every message template manually. LevitateOS includes 16 AI agents including a BizDev Agent that automatically finds leads matching your ideal customer profile and initiates conversations on WhatsApp in natural Hinglish.' },
        },
        {
            '@type': 'Question',
            name: 'How does pricing compare between WATI and LevitateOS?',
            acceptedAnswer: { '@type': 'Answer', text: 'WATI charges per conversation (approx ₹0.35-0.80 per conversation) plus a platform fee of ₹3,000-5,000/month. High-volume businesses often pay ₹15,000-30,000/month. LevitateOS charges a flat ₹4,999-19,999/month with unlimited WhatsApp conversations and no per-message fees.' },
        },
        {
            '@type': 'Question',
            name: 'Can I use WATI without a developer?',
            acceptedAnswer: { '@type': 'Answer', text: 'WATI requires technical setup including WhatsApp Business API approval, webhook configuration, and template approval from Meta. Most businesses need a developer or agency to set it up. LevitateOS requires zero technical knowledge—just scan a QR code with your WhatsApp Business app and you are live in 2 minutes.' },
        },
        {
            '@type': 'Question',
            name: 'What happens if I outgrow WATI?',
            acceptedAnswer: { '@type': 'Answer', text: 'WATI is designed specifically for WhatsApp messaging. As your business grows, you will inevitably need a CRM (like Zoho or HubSpot), a website builder, proposal software, invoicing tools, and analytics platforms. LevitateOS scales with you because all these tools are built into the core platform from day one.' },
        },
    ],
};

export default function VsWatiPage() {
    return (
        <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <JsonLd schema={faqSchema} />

            <section className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 sm:pt-32">
                <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                    <Link href="/compare" className="hover:text-[var(--gold-base)]">Comparisons</Link>
                    <span>/</span>
                    <span className="text-[var(--text-secondary)]">vs WATI</span>
                </div>
                <h1 className="font-headline text-[clamp(1.75rem,5vw,3rem)] leading-[1.1]">LevitateOS vs WATI</h1>
                <p className="mt-4 text-lg text-[var(--text-secondary)]">
                    WATI is a WhatsApp messaging tool. LevitateOS is a full business operating system that finds leads, closes deals, and grows your business on autopilot.
                </p>
            </section>

            <article className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 prose prose-invert prose-sm max-w-none">
                <p>
                    The WhatsApp Business API ecosystem in India has exploded over the past three years. With over 500 million WhatsApp users in India and businesses recognising the channel&apos;s immense potential, tools like WATI have gained significant traction. WATI positions itself as a &ldquo;WhatsApp engagement platform&rdquo; that helps businesses manage customer conversations at scale. But here is the uncomfortable truth: WATI solves only 10% of your business automation needs. The other 90%—lead generation, CRM, proposals, invoicing, website, analytics—requires a completely separate stack of tools.
                </p>
                <p>
                    Let us be clear about what WATI actually is. WATI provides a user-friendly interface on top of the WhatsApp Business API. It allows you to send template messages, manage chat inboxes, set up basic rule-based chatbots, and track simple metrics like message delivery rates. That is genuinely useful if your only problem is &ldquo;we have too many WhatsApp messages and need a shared inbox.&rdquo; But for most growing businesses, the challenge is not managing incoming messages—it is generating new leads, converting them to customers, and retaining them for repeat business.
                </p>
                <p>
                    This is where the fundamental architectural difference between WATI and LevitateOS becomes apparent. WATI is a single-purpose tool in a world that demands multi-purpose platforms. When you choose WATI, you are signing up for a fragmented tech stack: WATI for WhatsApp, Zoho CRM for customer relationship management, Canva or a website builder for proposals and websites, Razorpay for payments, Tally or Zoho Books for invoicing, and Google Analytics for tracking. Each tool requires its own login, its own configuration, its own data silo, and its own monthly subscription.
                </p>
                <p>
                    LevitateOS eliminates this fragmentation by design. We built a unified business operating system where WhatsApp is the interface, but the engine includes 16 AI agents handling everything from lead generation to invoice chasing. The BizDev Agent continuously scans the internet for businesses matching your ideal customer profile—by industry, location, company size, and recent funding or expansion signals. When it finds a qualified lead, it initiates a personalised WhatsApp conversation in natural Hinglish, qualifies the lead, and books a meeting on your calendar. WATI cannot do any of this—it lacks lead generation capabilities entirely.
                </p>
                <p>
                    Consider the typical customer journey when you use WATI versus LevitateOS. With WATI: A lead messages you on WhatsApp → your team manually responds → someone manually creates a lead record in your CRM → someone manually sends a proposal (created in another tool) → someone manually creates an invoice (in yet another tool) → someone manually follows up for payment. With LevitateOS: A lead messages you → AI qualifies and scores the lead → AI sends a proposal PDF instantly → AI sends a payment link → AI chases the invoice until paid → all logged automatically in your CRM pipeline. The difference in efficiency is not incremental—it is transformational.
                </p>
                <p>
                    Pricing structures reveal a lot about product philosophy. WATI uses a &ldquo;per-conversation&rdquo; pricing model typical of communication tools. You pay a platform fee of ₹3,000-5,000 per month plus ₹0.35-0.80 per conversation (a 24-hour window of messaging). For a business doing 5,000 conversations monthly, that is ₹4,750-9,000 total. But here is the catch: WATI&apos;s pricing does not include any of the tools you actually need to convert those conversations into revenue. You still pay for your CRM, your website builder, your proposal software, and everything else. LevitateOS bundles everything into a flat ₹4,999-19,999/month with unlimited conversations and all features included.
                </p>
                <p>
                    The onboarding experience highlights another critical difference. WATI requires WhatsApp Business API approval from Meta—a process that can take 3-5 days and often requires technical troubleshooting. You need to configure webhooks, get template messages approved, set up chatbot flows, and integrate with your existing tools. WATI provides documentation and some onboarding support, but you will likely need a developer or agency to get everything working smoothly. LevitateOS uses a radically different approach: scan a QR code with your WhatsApp Business app, and your entire business operating system is live in 2 minutes. No APIs to configure, no webhooks to set up, no templates to get approved.
                </p>
                <p>
                    For Indian businesses, language support is a massive differentiator. WATI&apos;s AI and templates operate primarily in English. While you can manually write Hinglish messages, the chatbot builder and automated sequences are English-centric. LevitateOS was built in India, for India. Our AI agents naturally converse in Hinglish—the mixed English-Hindi that most Indian customers actually use. We support Hindi, Gujarati, Tamil, Telugu, and other regional languages out of the box. When a customer messages &ldquo;Bhaiya price batao&rdquo; (Brother, tell me the price), LevitateOS responds appropriately in Hinglish, not broken English.
                </p>
                <p>
                    Team collaboration is another area where the two platforms diverge completely. WATI offers basic chat assignment—you can assign a conversation to a team member. That is it. There is no project management, no task assignments, no internal chat, no document collaboration. LevitateOS includes full project management with Kanban boards, task assignments with due dates, internal team chat, document sharing, and progress tracking. Your team can run their entire operation from within LevitateOS—not just customer conversations, but internal workflows too.
                </p>
                <p>
                    Perhaps the most telling comparison is what happens when something goes wrong. WATI provides email and chat support during business hours. If your WhatsApp API breaks on a Saturday night during a major campaign, you are waiting until Monday morning. LevitateOS provides 24/7 WhatsApp access to our engineering team. Message us at 11 PM on Diwali, and you will get a response within minutes. Our &ldquo;support&rdquo; is actually our product and engineering team directly—no ticket systems, no call centers, no &ldquo;please allow 24 hours for a response.&rdquo;
                </p>
                <p>
                    If you are currently using WATI and wondering whether to switch, ask yourself this: how much time does your team spend manually moving data between WATI, your CRM, your proposal tool, and your invoicing software? If the answer is &ldquo;more than 5 hours per week,&rdquo; LevitateOS will pay for itself in reclaimed productivity alone. And that doesn&apos;t even account for the new leads our AI agents will find and convert while your team sleeps.
                </p>
            </article>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="mb-6 text-xl font-semibold">Feature-by-Feature Comparison</h2>
                <ComparisonTable
                    platformA={{ name: 'WATI', color: 'text-[var(--text-tertiary)]', features: watiFeatures }}
                    platformB={{ name: 'LevitateOS', color: 'text-[var(--gold-base)]', features: watiFeatures }}
                    intro="WATI handles WhatsApp messaging. LevitateOS handles your entire business."
                />
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <h2 className="mb-6 text-xl font-semibold">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">What is the core difference between WATI and LevitateOS?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">WATI is a WhatsApp Business API tool that helps you send messages and manage chats. It does not include lead generation, CRM, website building, proposal generation, or business intelligence. LevitateOS is a complete business operating system that includes all of these plus WhatsApp automation.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Does WATI have AI lead generation like LevitateOS?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">No. WATI is a passive tool—you must bring your own leads and configure every message template manually. LevitateOS includes 16 AI agents including a BizDev Agent that automatically finds leads matching your ideal customer profile and initiates conversations on WhatsApp.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">How does pricing compare between WATI and LevitateOS?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">WATI charges per conversation plus platform fees, often totaling ₹15,000-30,000/month for high-volume businesses. LevitateOS charges a flat ₹4,999-19,999/month with unlimited conversations and all features included.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">Can I use WATI without a developer?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">WATI requires technical setup including Meta API approval and webhook configuration. Most businesses need a developer. LevitateOS requires zero technical knowledge—just scan a QR code and you are live in 2 minutes.</p>
                    </details>
                    <details className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                        <summary className="cursor-pointer font-medium">What happens if I outgrow WATI?</summary>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">WATI is designed specifically for WhatsApp messaging. You will still need a CRM, website builder, and more. LevitateOS scales with you because all these tools are built into the core platform from day one.</p>
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
                        <h3 className="text-sm font-semibold text-[var(--gold-base)]">Ready to switch? Start with LevitateOS</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">Get a complete business OS. 2-minute setup, flat INR pricing.</p>
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
