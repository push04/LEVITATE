'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Heart, Users, DollarSign, Cpu, PenTool, Wrench, Megaphone } from 'lucide-react';
import Link from 'next/link';

export default function CareersPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] pt-20">
            {/* Hero Section */}
            <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-[var(--secondary)]/20 pointer-events-none" />

                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="inline-block px-4 py-1.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium text-sm mb-6 border border-[var(--primary)]/20">
                            Join the Family
                        </span>
                        <h1 className="text-5xl md:text-7xl font-bold font-heading mb-6 leading-tight">
                            More Than a Team.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-purple-400">
                                A Startup Family.
                            </span>
                        </h1>
                        <p className="text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
                            We don&apos;t hire employees; we partner with visionaries.
                            Build the future with us, share the risks, and own the rewards.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/careers/apply">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-8 py-4 bg-[var(--primary)] text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--primary)]/25 hover:shadow-[var(--primary)]/40 hover:bg-[var(--primary)]/90 transition-all"
                                >
                                    Apply to Join
                                    <ArrowRight className="w-5 h-5" />
                                </motion.button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* The Model Section */}
            <section className="py-20 bg-[var(--surface)] text-[var(--foreground)]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        {/* Value 1 */}
                        <div className="p-8 rounded-3xl bg-[var(--background)] border border-[var(--border)] relative overflow-hidden group hover:border-[var(--primary)]/50 transition-colors">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                            <DollarSign className="w-10 h-10 text-[var(--primary)] mb-6" />
                            <h3 className="text-2xl font-bold mb-4">No Salary. 100% Profit Share.</h3>
                            <p className="text-[var(--muted)]">
                                We don&apos;t believe in capping your potential. You aren&apos;t paid for your time; you are paid for your impact.
                                We share project profits with <strong>100% Transparency</strong>.
                            </p>
                        </div>

                        {/* Value 2 */}
                        <div className="p-8 rounded-3xl bg-[var(--background)] border border-[var(--border)] relative overflow-hidden group hover:border-[var(--primary)]/50 transition-colors">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                            <Users className="w-10 h-10 text-purple-500 mb-6" />
                            <h3 className="text-2xl font-bold mb-4">A Family, Not a Corp.</h3>
                            <p className="text-[var(--muted)]">
                                No politics. No hierarchy. Just a group of passionate builders supporting each other.
                                We eat together, fail together, and succeed together.
                            </p>
                        </div>

                        {/* Value 3 */}
                        <div className="p-8 rounded-3xl bg-[var(--background)] border border-[var(--border)] relative overflow-hidden group hover:border-[var(--primary)]/50 transition-colors">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                            <Heart className="w-10 h-10 text-pink-500 mb-6" />
                            <h3 className="text-2xl font-bold mb-4">Complete Transparency.</h3>
                            <p className="text-[var(--muted)]">
                                You see the client contracts. You see the numbers. You know exactly what your share is.
                                Trust is our currency.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Departments */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl font-bold font-heading text-center mb-16">Where Do You Fit In?</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { icon: Cpu, title: 'Technology Development', desc: 'Frontend, Backend, Full Stack. Building robust digital infrastructure.', color: 'text-blue-500' },
                            { icon: Wrench, title: 'Mechanical Design', desc: 'CAD, 3D Modeling, Engineering. Bringing physical ideas to life.', color: 'text-orange-500' },
                            { icon: PenTool, title: 'UI/UX & Design', desc: 'Sleek, Modern, Impactful. Crafting experiences that "Wow".', color: 'text-pink-500' },
                            { icon: Megaphone, title: 'Sales & Marketing', desc: 'Growth, Strategy, Outreach. Telling our story to the world.', color: 'text-green-500' },
                        ].map((dept, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-start gap-6 p-6 rounded-2xl bg-[var(--surface)]/50 border border-[var(--border)] hover:bg-[var(--surface)] transition-all"
                            >
                                <div className={`p-3 rounded-xl bg-[var(--background)] shadow-sm ${dept.color}`}>
                                    <dept.icon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-2">{dept.title}</h3>
                                    <p className="text-[var(--muted)]">{dept.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 text-center">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-3xl font-bold mb-6">Ready to break the mold?</h2>
                    <p className="text-[var(--muted)] mb-8">
                        The interview isn&apos;t a test. It&apos;s a conversation.
                        Chat with our AI Recruiter to see if we&apos;re a match.
                    </p>
                    <Link href="/careers/apply">
                        <button className="px-10 py-4 bg-[var(--foreground)] text-[var(--background)] rounded-full font-bold text-lg hover:opacity-90 transition-opacity">
                            Start Interview
                        </button>
                    </Link>
                </div>
            </section>
        </div>
    );
}
