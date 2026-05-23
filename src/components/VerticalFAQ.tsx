'use client';

import { useState } from 'react';
import JsonLd from '@/components/ui/JsonLd';

interface FAQItem {
    q: string;
    a: string;
}

interface VerticalFAQProps {
    faqs: FAQItem[];
    title?: string;
}

export default function VerticalFAQ({ faqs, title = "Frequently Asked Questions" }: VerticalFAQProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
            },
        })),
    };

    return (
        <section className="relative overflow-hidden bg-[var(--background)] py-16 md:py-28 w-full">
            <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-12">
                <h2 className="font-headline text-[clamp(1.25rem,5vw,2rem)] leading-[0.92] tracking-tight text-[var(--foreground)] md:text-6xl lg:text-7xl mb-10 md:mb-20">
                    {title}
                </h2>

                <div className="max-w-3xl mx-auto space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="rounded-[20px] border border-[var(--border)] bg-white/55 backdrop-blur overflow-hidden"
                        >
                            <button
                                onClick={() => toggle(index)}
                                className="w-full flex items-center justify-between px-6 py-4 text-left"
                                aria-expanded={openIndex === index}
                                aria-controls={`faq-answer-${index}`}
                            >
                                <span className="font-body text-base md:text-lg font-medium text-[var(--foreground)] pr-4">
                                    {faq.q}
                                </span>
                                <svg
                                    className={`h-5 w-5 flex-shrink-0 text-[#C8A96E] transition-transform duration-300 ${
                                        openIndex === index ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {openIndex === index && (
                                <div
                                    id={`faq-answer-${index}`}
                                    className="px-6 pb-4"
                                >
                                    <p className="font-body text-sm md:text-base text-[var(--muted)] leading-relaxed">
                                        {faq.a}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <JsonLd data={faqSchema} />
        </section>
    );
}
