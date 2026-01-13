'use client';

import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
    ArrowLeft, ArrowRight, Clock, CheckCircle,
    ChevronDown, ChevronUp, Package, Zap,
    Code, Wrench, TrendingUp, Palette
} from 'lucide-react';
import { useState } from 'react';
import { getServiceBySlug, services, categoryInfo } from '@/data/services';

const categoryIcons = {
    web: Code,
    mechanical: Wrench,
    growth: TrendingUp,
    creative: Palette
};

export default function ServicePageClient({ slug }: { slug: string }) {
    const service = getServiceBySlug(slug);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    if (!service) {
        notFound();
    }

    const category = categoryInfo[service.category];
    const CategoryIcon = categoryIcons[service.category];

    // Find next/prev services in same category
    const categoryServices = services.filter(s => s.category === service.category);
    const currentIndex = categoryServices.findIndex(s => s.slug === slug);
    const prevService = categoryServices[currentIndex - 1];
    const nextService = categoryServices[currentIndex + 1];

    return (
        <div className="min-h-screen pt-16">
            {/* Hero Section */}
            <section className={`relative py-20 bg-gradient-to-br ${category.color} overflow-hidden`}>
                <div className="absolute inset-0 grid-bg opacity-10" />

                {/* Floating decorations */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                    className="absolute top-10 right-10 w-64 h-64 border border-white/10 rounded-full"
                />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/#services"
                        className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Services
                    </Link>

                    <div className="flex items-start gap-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm"
                        >
                            <CategoryIcon className="w-12 h-12 text-white" />
                        </motion.div>

                        <div className="flex-1">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-sm mb-4">
                                    {category.name}
                                </span>
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
                                    {service.name}
                                </h1>
                                <p className="text-xl text-white/90 max-w-2xl">
                                    {service.shortDescription}
                                </p>

                                <div className="flex flex-wrap items-center gap-6 mt-8">
                                    <div className="flex items-center gap-2">
                                        <span className="text-3xl font-bold text-white">{service.price}</span>
                                        <span className="text-white/70">/ {service.priceUnit}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/80">
                                        <Clock className="w-5 h-5" />
                                        <span>{service.timeline}</span>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8">
                                    <motion.a
                                        href="#contact"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold 
                                                 hover:shadow-lg transition-shadow"
                                    >
                                        Get Started
                                    </motion.a>
                                    <motion.a
                                        href="#process"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold
                                                 hover:bg-white/10 transition-colors"
                                    >
                                        See Process
                                    </motion.a>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Description Section */}
            <section className="py-16 bg-[var(--background)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-12">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-3xl font-bold mb-6">About This Service</h2>
                            <p className="text-lg text-[var(--muted)] leading-relaxed">
                                {service.longDescription}
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="glass-card p-8"
                        >
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Package className="w-5 h-5 text-[var(--primary)]" />
                                What You Get
                            </h3>
                            <ul className="space-y-3">
                                {service.deliverables.map((item, i) => (
                                    <motion.li
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex items-start gap-3"
                                    >
                                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                        <span>{item}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features & Benefits */}
            <section className="py-16 bg-[var(--surface)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Features */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-2xl font-bold mb-6">Features</h2>
                            <div className="space-y-4">
                                {service.features.map((feature, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-center gap-3 p-4 rounded-xl bg-[var(--background)]"
                                    >
                                        <Zap className="w-5 h-5 text-[var(--primary)]" />
                                        <span>{feature}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Benefits */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                        >
                            <h2 className="text-2xl font-bold mb-6">Benefits</h2>
                            <div className="space-y-4">
                                {service.benefits.map((benefit, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-center gap-3 p-4 rounded-xl bg-[var(--background)]"
                                    >
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                        <span>{benefit}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Process Section */}
            <section id="process" className="py-16 bg-[var(--background)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">Our Process</h2>
                        <p className="text-[var(--muted)]">How we deliver exceptional results</p>
                    </motion.div>

                    <div className="grid md:grid-cols-5 gap-4">
                        {service.processSteps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card p-6 text-center relative"
                            >
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${category.color} 
                                              flex items-center justify-center text-white font-bold mx-auto mb-4`}>
                                    {step.step}
                                </div>
                                <h3 className="font-bold mb-2">{step.title}</h3>
                                <p className="text-sm text-[var(--muted)]">{step.description}</p>

                                {i < service.processSteps.length - 1 && (
                                    <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 
                                                          w-6 h-6 text-[var(--muted)] z-10" />
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-16 bg-[var(--surface)]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
                    </motion.div>

                    <div className="space-y-4">
                        {service.faq.map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full p-6 text-left flex items-center justify-between 
                                             hover:bg-[var(--secondary)]/50 transition-colors"
                                >
                                    <span className="font-medium">{item.q}</span>
                                    {openFaq === i ? (
                                        <ChevronUp className="w-5 h-5 text-[var(--primary)]" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5" />
                                    )}
                                </button>
                                {openFaq === i && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="px-6 pb-6 text-[var(--muted)]"
                                    >
                                        {item.a}
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section id="contact" className="py-16 bg-[var(--background)]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className={`glass-card p-12 bg-gradient-to-br ${category.color}`}
                    >
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Ready to Get Started?
                        </h2>
                        <p className="text-white/80 mb-8 max-w-xl mx-auto">
                            Let&apos;s discuss your project and see how {service.name} can help you achieve your goals.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <motion.a
                                href="/#contact"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold 
                                         hover:shadow-lg transition-shadow"
                            >
                                Start Your Project
                            </motion.a>
                            <motion.a
                                href="https://wa.me/916299549112"
                                target="_blank"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold
                                         hover:bg-white/10 transition-colors"
                            >
                                WhatsApp Us
                            </motion.a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Navigation to other services */}
            <section className="py-8 border-t border-[var(--border)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        {prevService ? (
                            <Link
                                href={`/services/${prevService.slug}`}
                                className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>{prevService.name}</span>
                            </Link>
                        ) : <div />}

                        {nextService ? (
                            <Link
                                href={`/services/${nextService.slug}`}
                                className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                            >
                                <span>{nextService.name}</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        ) : <div />}
                    </div>
                </div>
            </section>
        </div>
    );
}
