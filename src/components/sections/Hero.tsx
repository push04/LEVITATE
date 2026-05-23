'use client';

import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { useRef } from 'react';
import DemoVideoEmbed from '@/components/media/DemoVideoEmbed';
import MobileLiveStatsStrip from '@/components/sections/MobileLiveStatsStrip';
import WhatsAppChannelCTA from '@/components/WhatsAppChannelCTA';

export default function Hero() {
    const servicesRef = useRef<HTMLDivElement>(null);
    const isServicesInView = useInView(servicesRef, { once: true, margin: "-100px" });

    return (
        <section
            id="home"
            className="relative flex flex-col items-start overflow-hidden pt-24 pb-8 md:min-h-[90vh] md:justify-center md:pt-32 md:pb-16"
        >
            {/* Architectural Background Glow */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#C8A96E]/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

            {/* Subtle Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(242,239,233,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(242,239,233,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

            {/* Hero Geometric Element (Right Side) - Desktop only */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden lg:flex items-center justify-center w-[600px] h-[600px] pointer-events-none opacity-30 translate-x-1/4">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                    className="absolute w-[400px] h-[400px] border border-[#C8A96E]/40 rounded-full"
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
                    className="absolute w-[550px] h-[550px] border border-[var(--border)] rounded-full border-dashed"
                />
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
                    className="absolute w-[700px] h-[700px] border border-[#C8A96E]/10 rounded-full"
                />
                <div className="absolute w-2 h-2 bg-[#C8A96E] rounded-full" />
                <div className="absolute w-[80px] h-[1px] bg-[#C8A96E]/50" />
                <div className="absolute h-[80px] w-[1px] bg-[#C8A96E]/50" />
            </div>

            <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-12 flex flex-col relative z-10">
                {/* Intro Utility Text */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                    className="mb-6 md:mb-8 flex items-center gap-3 md:gap-4"
                >
                    <div className="w-8 md:w-12 h-[1px] bg-[#C8A96E]" />
                    <span className="font-label uppercase tracking-[0.2em] text-[9px] md:text-[10px] text-[#C8A96E]">
                        Levitate Labs | LevitateOS
                    </span>
                </motion.div>

                {/* Massive Headline - proper responsive scale */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="font-ui text-[clamp(2rem,8vw,3.5rem)] md:font-headline md:text-8xl md:leading-[0.9] lg:text-9xl tracking-tight leading-[1.1] text-[var(--foreground)] max-w-5xl"
                >
                    <span className="text-[#C8A96E] block md:inline">LevitateOS</span>
                    <span className="block mt-2 md:mt-0 md:inline">
                        {' '}built for Indian businesses.
                    </span>
                </motion.h1>

                {/* Subheadline Paragraph */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                    className="font-body text-[var(--muted)] text-sm md:text-base mt-4 md:mt-8 max-w-2xl font-light tracking-wide leading-relaxed md:text-xl"
                >
                    An email and WhatsApp-first CRM and automation operating system that unifies lead capture, follow-ups, proposals, delivery tracking, files, and reporting in one workspace. We also ship custom automation and agentic AI services for teams that want to operationalize research, outreach, and execution end to end.
                </motion.p>

                {/* CTA Area - VIEW PLANS solid, OPEN DASHBOARD outlined */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }}
                    className="mt-8 sm:mt-16 flex flex-col w-full gap-3 sm:flex-row sm:items-center sm:gap-4"
                >
                    <Link
                        href="/onboard"
                        className="inline-flex w-full items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-5 py-3.5 text-sm font-semibold text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] transition-all duration-150 hover:brightness-110"
                    >
                        VIEW PLANS
                    </Link>

                    <Link
                        href="/business/login"
                        className="inline-flex w-full items-center justify-center rounded-[10px] border border-[#C8A96E]/40 bg-transparent px-5 py-3.5 text-sm font-semibold text-[#C8A96E] transition-all duration-150 hover:brightness-110 hover:border-[#C8A96E]/60"
                    >
                        OPEN DASHBOARD
                    </Link>
                </motion.div>

                {/* Start Free Trial button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 1.0, ease: 'easeOut' }}
                    className="mt-3 sm:mt-4 flex justify-center"
                >
                    <Link
                        href="/trial"
                        className="inline-flex w-full sm:w-auto items-center justify-center rounded-[10px] border border-[#C8A96E]/40 bg-transparent px-5 py-3 text-sm font-semibold text-[#C8A96E] transition-all duration-150 hover:border-[#C8A96E]/60 hover:brightness-110"
                    >
                        Start Free Trial — No Credit Card
                    </Link>
                </motion.div>

                {/* WhatsApp Channel CTA */}
                <WhatsAppChannelCTA />

                {/* Mobile-only: fill the hero dead-space with live stats */}
                <MobileLiveStatsStrip />

                {/* Demo video (lazy iframe + poster overlay) */}
                <DemoVideoEmbed />
            </div>
        </section>
    );
}
