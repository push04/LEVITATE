'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';



export default function RestaurantsPage() {
    const [restaurantsServed] = useState(847);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'page_view', vertical: 'restaurants', path: '/for/restaurants' }),
            }).catch(() => {});
        }
    }, []);

    const faqs = [
        { q: 'How fast can I get my restaurant website live?', a: 'Your professional restaurant website goes live within 24 hours. Menu, WhatsApp ordering, and Google Maps integration included.' },
        { q: 'Does the WhatsApp menu work with my current number?', a: 'Yes. Connect your existing business WhatsApp number. Customers get your menu instantly when they message you.' },
        { q: 'Will my restaurant show up on Google Maps?', a: 'We optimize your Google Business Profile for local search. Auto-manage reviews, update hours, and respond to customers.' },
        { q: 'Can I update my menu myself?', a: 'Yes. Update your menu anytime from your dashboard. Changes reflect instantly on your website and WhatsApp menu.' },
        { q: 'Do I need technical knowledge to manage this?', a: 'No. Our AI website builder handles everything. You just provide your menu, photos, and business details.' },
    ];

    const features = [
        { title: 'AI Website Builder (24h Guarantee)', desc: 'Professional restaurant website live in 24 hours. Menu, WhatsApp ordering, Google Maps — all included.' },
        { title: 'WhatsApp Menu Automation', desc: 'Customers text your WhatsApp, get your menu instantly. Orders come directly to your phone.' },
        { title: 'Google Business Optimization', desc: 'Rank higher in local search. Auto-manage reviews, update hours, and respond to customers.' },
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
                    Get a Professional Website in 24 Hours.<br /><span className="text-[#C8A96E]">Start Getting Orders Online.</span>
                </h1>
                <p className="mt-4 text-lg text-[var(--muted)] max-w-2xl mx-auto">AI website builder with 24-hour delivery guarantee, WhatsApp menu automation, and Google Business Profile optimization.</p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#111111] border border-[#C8A96E]/20 px-4 py-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8A96E] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C8A96E]"></span>
                    </span>
                    <span className="text-sm text-[var(--muted)]">Restaurants served: <span className="text-[#C8A96E] font-semibold">{restaurantsServed}</span></span>
                </div>

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
                    Start free trial for restaurants
                </Link>
            </div>
        </main>
    );
}
