'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Code, Cog } from 'lucide-react';

export default function Hero() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start'],
    });

    const codeRotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
    const gearRotate = useTransform(scrollYProgress, [0, 1], [0, -360]);

    const codeSnippets = [
        'const levitate = () => {',
        '  return innovation;',
        '};',
        '',
        'async function build() {',
        '  await precision();',
        '  deploy(future);',
        '}',
    ];

    return (
        <section
            ref={containerRef}
            id="home"
            className="relative min-h-screen flex items-center justify-center overflow-hidden"
        >
            {/* Grid Background */}
            <div className="absolute inset-0 grid-bg opacity-50" />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--background)]" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                                      bg-[var(--primary)]/10 border border-[var(--primary)]/20 mb-6">
                            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                            <span className="text-sm text-[var(--primary)] font-medium">
                                Web • Engineering • Marketing • Design
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-heading leading-tight mb-6">
                            We Build What{' '}
                            <span className="gradient-text">Others Can&apos;t.</span>
                            {' '}You{' '}
                            <span className="text-[var(--primary)]">Scale Faster.</span>
                        </h1>

                        <p className="text-lg text-[var(--muted)] mb-8 max-w-lg">
                            From stunning websites to CAD designs, marketing funnels to brand identity—we&apos;re your one-stop team. No freelancer roulette. Just real results, on time.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <motion.a
                                href="#services"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="btn-primary inline-flex items-center gap-2"
                            >
                                See Our Work
                                <ArrowRight className="w-4 h-4" />
                            </motion.a>
                            <motion.a
                                href="#contact"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="btn-secondary inline-flex items-center gap-2"
                            >
                                Start a Project
                            </motion.a>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-8 mt-12 pt-8 border-t border-[var(--border)]">
                            <div>
                                <div className="text-3xl font-bold text-[var(--primary)]">50+</div>
                                <div className="text-sm text-[var(--muted)]">Projects</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-[var(--primary)]">4</div>
                                <div className="text-sm text-[var(--muted)]">Disciplines</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-[var(--primary)]">100%</div>
                                <div className="text-sm text-[var(--muted)]">Dedication</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Animated Visual - CODE PANEL + ROTATING GEARS */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="hidden lg:block relative"
                    >
                        <div className="relative w-full aspect-square max-w-md mx-auto">
                            {/* Rotating Gear - Background */}
                            <motion.div
                                style={{ rotate: gearRotate }}
                                className="absolute top-0 right-0 text-[var(--primary)]/20"
                            >
                                <Cog className="w-32 h-32" />
                            </motion.div>

                            {/* Rotating Code Icon */}
                            <motion.div
                                style={{ rotate: codeRotate }}
                                className="absolute bottom-10 left-0 text-[var(--primary)]/20"
                            >
                                <Code className="w-24 h-24" />
                            </motion.div>

                            {/* Terminal/Code Panel */}
                            <motion.div
                                initial={{ y: 20 }}
                                animate={{ y: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="relative glass-card p-6 rounded-2xl shadow-2xl"
                            >
                                {/* Terminal Header */}
                                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border)]">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="ml-2 text-xs text-[var(--muted)] font-mono">levitate.js</span>
                                </div>

                                {/* Code Content */}
                                <div className="font-mono text-sm space-y-1">
                                    {codeSnippets.map((line, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + i * 0.1 }}
                                            className="flex"
                                        >
                                            <span className="text-[var(--muted)] w-6 select-none">{i + 1}</span>
                                            <span className={
                                                line.includes('const') || line.includes('async') || line.includes('function')
                                                    ? 'text-purple-400'
                                                    : line.includes('return') || line.includes('await')
                                                        ? 'text-blue-400'
                                                        : line.includes('(') || line.includes(')')
                                                            ? 'text-yellow-400'
                                                            : 'text-[var(--foreground)]'
                                            }>
                                                {line || '\u00A0'}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Blinking Cursor */}
                                <motion.div
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="w-2 h-4 bg-[var(--primary)] mt-2 ml-6"
                                />
                            </motion.div>

                            {/* Floating Badge */}
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                                className="absolute -top-4 -right-4 glass-card px-4 py-2 rounded-xl"
                            >
                                <span className="text-sm font-medium text-[var(--primary)]">✨ Available Now</span>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
