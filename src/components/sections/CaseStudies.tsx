'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Server, Cpu, LineChart, Zap, Shield, Globe } from 'lucide-react';

interface CaseStudy {
    name: string;
    url: string;
    description: string;
    techStack: { name: string; icon: React.ElementType }[];
    highlights: string[];
    metrics: { label: string; value: string }[];
    gradient: string;
}

const caseStudies: CaseStudy[] = [
    {
        name: 'Stootap.com',
        url: 'https://stootap.com',
        description: 'Serverless marketplace with React/Vite frontend and Netlify Functions backend.',
        techStack: [
            { name: 'Netlify Functions', icon: Server },
            { name: 'Supabase Auth', icon: Shield },
            { name: 'Drizzle ORM', icon: Cpu },
        ],
        highlights: [
            'Secure auth with middleware & role separation (RBAC)',
            'Razorpay commerce flows with webhook reconciliation',
            'Type-safe database access with Drizzle & Zod validation',
        ],
        metrics: [
            { label: 'Latency', value: '<100ms' },
            { label: 'Uptime', value: '99.9%' },
            { label: 'Users', value: '10K+' },
        ],
        gradient: 'from-cobalt to-purple-500',
    },
    {
        name: 'Zenjaura.in',
        url: 'https://zenjaura.in',
        description: 'Premium WordPress website with custom theme and optimized performance.',
        techStack: [
            { name: 'WordPress', icon: Globe },
            { name: 'Core Web Vitals', icon: LineChart },
            { name: 'Custom Theme', icon: Zap },
        ],
        highlights: [
            'Custom WordPress theme for unique brand identity',
            'Optimized Core Web Vitals for fast loading',
            'SEO-friendly structure with schema markup',
        ],
        metrics: [
            { label: 'LCP', value: '<2.5s' },
            { label: 'CLS', value: '<0.1' },
            { label: 'SEO Score', value: '98' },
        ],
        gradient: 'from-orange to-pink-500',
    },
];

export default function CaseStudies() {
    return (
        <section id="case-studies" className="py-24 bg-[var(--surface)] relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 grid-bg opacity-30" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading mb-4">
                        Real <span className="gradient-text">Results</span>
                    </h2>
                    <p className="text-[var(--muted)] max-w-2xl mx-auto">
                        Check out what we've built. These projects are live and working—click to see them yourself.
                    </p>
                </motion.div>

                {/* Case Study Cards */}
                <div className="grid lg:grid-cols-2 gap-8">
                    {caseStudies.map((study, index) => (
                        <motion.div
                            key={study.name}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2 }}
                        >
                            <CaseStudyCard study={study} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CaseStudyCard({ study }: { study: CaseStudy }) {
    return (
        <motion.a
            href={study.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="glass-card overflow-hidden group h-full block cursor-pointer"
        >
            {/* Header with Gradient */}
            <div className={`bg-gradient-to-r ${study.gradient} p-6 relative`}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-bold text-white mb-1 inline-flex items-center gap-2">
                            {study.name}
                            <ExternalLink className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-white/80 text-sm">{study.description}</p>
                    </div>
                    <motion.div
                        whileHover={{ scale: 1.2, rotate: -10 }}
                        className="p-3 rounded-xl bg-white/20 backdrop-blur-sm text-white 
                                 group-hover:bg-white group-hover:text-gray-900 transition-colors"
                    >
                        <ExternalLink className="w-5 h-5" />
                    </motion.div>
                </div>

                {/* Decorative circles */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full 
                      bg-white/10 blur-xl" />
            </div>

            {/* Content */}
            <div className="p-6">
                {/* Tech Stack */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">
                        Tech Stack
                    </h4>
                    <div className="flex flex-wrap gap-3">
                        {study.techStack.map((tech) => (
                            <div
                                key={tech.name}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl 
                         bg-[var(--secondary)] group-hover:bg-[var(--primary)]/10
                         transition-colors duration-300"
                            >
                                <tech.icon className="w-4 h-4 text-[var(--primary)]" />
                                <span className="text-sm font-medium">{tech.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Highlights */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">
                        Technical Highlights
                    </h4>
                    <ul className="space-y-2">
                        {study.highlights.map((highlight, i) => (
                            <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-[var(--muted)]"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-2 flex-shrink-0" />
                                {highlight}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
                    {study.metrics.map((metric) => (
                        <div key={metric.label} className="text-center">
                            <div className="text-xl font-bold text-[var(--primary)]">
                                {metric.value}
                            </div>
                            <div className="text-xs text-[var(--muted)]">{metric.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.a>
    );
}
