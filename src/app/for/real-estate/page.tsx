'use client';

import Link from 'next/link';
import { useEffect } from 'react';



export default function RealEstatePage() {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'page_view', vertical: 'real-estate', path: '/for/real-estate' }),
            }).catch(() => {});
        }
    }, []);

    const faqs = [
        { q: 'How does lead scoring work?', a: 'Hot leads get flagged automatically based on behavior, budget, and intent. Follow up with serious buyers first, not everyone equally.' },
        { q: 'Can I send property updates via WhatsApp?', a: 'Yes. Automated WhatsApp drip sequences send property updates, price drops, and new listings to interested buyers.' },
        { q: 'How fast can I generate a proposal PDF?', a: 'Generate professional property proposal PDFs with photos, pricing, and terms in seconds from your dashboard.' },
        { q: 'Does it work with my existing CRM?', a: 'Export/import data via CSV or use our API on the Scale plan. No complex migration needed.' },
        { q: 'Can I track which properties a lead is interested in?', a: 'Yes. Track all interactions, property views, and preferences for each lead. Get reminders to follow up at the right time.' },
    ];

    const features = [
        { title: 'Lead Scoring', desc: 'Hot leads get flagged automatically. Follow up with serious buyers first, not everyone equally.' },
        { title: 'WhatsApp Drip Sequences', desc: 'Property updates, price drops, and new listings sent automatically to interested buyers.' },
        { title: 'Automated Proposal PDFs', desc: 'Generate professional property proposal PDFs with photos, pricing, and terms in seconds.' },
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
                    Stop Losing Leads.<br /><span className="text-[#C8A96E]">Automate Your Follow-Up. Close More Properties.</span>
                </h1>
                <p className="mt-4 text-lg text-[var(--muted)] max-w-2xl mx-auto">Lead scoring, WhatsApp drip sequences, and automated proposal PDFs with property details — built for Indian real estate.</p>
                <Link href="/trial" className="mt-8 inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,#C8A96E,#a68a4a)] px-8 py-4 text-base font-semibold text-[#0a0a0a] shadow-[0_4px_16px_rgba(200,169,110,0.3)] transition-all duration-150 hover:brightness-105">
                    Start Free Trial
                </Link>
            </section>

            <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
                <div className="grid gap-6 sm:grid-cols-3">
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
                    Start free trial for real estate
                </Link>
            </div>
        </main>
    );
}
