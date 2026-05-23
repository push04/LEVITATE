'use client';

import Link from 'next/link';
import { useEffect } from 'react';



export default function CoachingPage() {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'page_view', vertical: 'coaching-centres', path: '/for/coaching-centres' }),
            }).catch(() => {});
        }
    }, []);

    const faqs = [
        { q: 'Can it handle bulk parent communications?', a: 'Yes. Send batch WhatsApp messages to parents with personalized student names and batch details.' },
        { q: 'Does it integrate with my existing ERP?', a: 'Export/import CSVs from any ERP. We also offer API access on the Scale plan.' },
        { q: 'How do seasonal campaigns work?', a: 'Set start/end dates, write your enrollment offer, and AI schedules messages to your entire lead list.' },
        { q: 'Can I generate fee proposals?', a: 'Yes. Create professional PDF proposals with course details, fee breakdown, and payment terms.' },
        { q: 'What about demo class follow-ups?', a: 'Automated WhatsApp sequences trigger after demo classes. Track attendance-to-enrollment conversion.' },
    ];

    const features = [
        { title: 'Lead Pipeline', desc: 'Track every inquiry from first call to enrollment. See exactly where students drop off.' },
        { title: 'Automated Follow-ups', desc: 'Never lose a lead to silence. WhatsApp and email sequences run automatically.' },
        { title: 'Seasonal Campaigns', desc: 'Launch enrollment drives before exam season. AI drafts messages, you approve.' },
        { title: 'Proposal Generation', desc: 'Generate professional fee proposals with course details and payment terms in seconds.' },
    ];

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    };

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-[var(--foreground)]">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            <section className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6 sm:pt-32 text-center">
                <h1 className="font-headline text-[clamp(2rem,7vw,3.5rem)] leading-[1.1] text-[var(--foreground)]">
                    Turn Inquiries Into Enrollments.<br /><span className="text-[#C8A96E]">Automate Your Admission Follow-Up.</span>
                </h1>
                <p className="mt-4 text-lg text-[var(--muted)] max-w-2xl mx-auto">Lead pipeline, automated follow-up sequences, seasonal enrollment campaigns, and proposal generation — all in one workspace.</p>
                <Link href="/trial" className="mt-8 inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#C8A96E,#a68a4a)] px-8 py-4 text-base font-semibold text-[#0a0a0a] shadow-[0_4px_16px_rgba(200,169,110,0.3)] transition-all duration-150 hover:brightness-105">
                    Start Free Trial
                </Link>
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map(f => (
                        <div key={f.title} className="rounded-[14px] border border-[#C8A96E]/20 bg-[#111111] p-6">
                            <h3 className="text-sm font-semibold text-[#C8A96E]">{f.title}</h3>
                            <p className="mt-2 text-sm text-[var(--muted)]">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
                <h2 className="text-xl font-semibold mb-6 text-[var(--foreground)]">Frequently asked questions</h2>
                <div className="grid gap-4">
                    {faqs.map(faq => (
                        <div key={faq.q} className="rounded-[14px] border border-[#C8A96E]/20 bg-[#111111] p-5">
                            <h3 className="text-sm font-semibold text-[var(--foreground)]">{faq.q}</h3>
                            <p className="mt-2 text-sm text-[var(--muted)]">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </section>

            <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#C8A96E]/20 bg-[#111111] p-4 sm:hidden">
                <Link href="/trial" className="flex w-full items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#C8A96E,#a68a4a)] px-5 py-3.5 text-sm font-semibold text-[#0a0a0a]">
                    Start free trial for coaching centres
                </Link>
            </div>
        </main>
    );
}
