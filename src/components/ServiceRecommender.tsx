'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Loader2, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

interface Recommendation {
    primary: {
        name: string;
        reason: string;
        slug: string;
    };
    secondary?: {
        name: string;
        reason: string;
        slug: string;
    } | null;
}

export default function ServiceRecommender() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

    const handleSubmit = async () => {
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        setRecommendation(null);

        try {
            const res = await fetch('/api/ai/recommend-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userNeeds: input })
            });
            const data = await res.json();

            if (data.success) {
                setRecommendation(data.recommendation);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const slugToPath: Record<string, string> = {
        web: '/services/custom-website-development',
        mechanical: '/services/3d-cad-modeling',
        growth: '/services/seo-optimization',
        creative: '/services/brand-identity-design'
    };

    return (
        <div className="my-8">
            {!isOpen ? (
                <motion.button
                    onClick={() => setIsOpen(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full p-6 glass-card border-2 border-dashed border-[var(--primary)]/30 hover:border-[var(--primary)] transition-colors text-center group"
                >
                    <Sparkles className="w-8 h-8 mx-auto mb-3 text-[var(--primary)] group-hover:animate-pulse" />
                    <h3 className="text-lg font-bold mb-1">Not sure what you need?</h3>
                    <p className="text-sm text-[var(--muted)]">Let AI recommend the perfect service for you</p>
                </motion.button>
            ) : (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="glass-card p-6 relative"
                >
                    <button
                        onClick={() => { setIsOpen(false); setRecommendation(null); setInput(''); }}
                        className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                        <h3 className="font-bold">AI Service Recommender</h3>
                    </div>

                    {!recommendation ? (
                        <>
                            <p className="text-sm text-[var(--muted)] mb-4">
                                Describe your project or business needs in a sentence or two:
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                                    placeholder="e.g., I need a website for my restaurant..."
                                    className="flex-1 px-4 py-3 rounded-xl bg-[var(--secondary)] border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                />
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !input.trim()}
                                    className="px-4 py-3 rounded-xl bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                        </>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            <div className="p-4 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30">
                                <p className="text-xs text-[var(--primary)] font-bold uppercase mb-1">Best Match</p>
                                <h4 className="text-lg font-bold">{recommendation.primary.name}</h4>
                                <p className="text-sm text-[var(--muted)] mb-3">{recommendation.primary.reason}</p>
                                <Link
                                    href={slugToPath[recommendation.primary.slug] || '#services'}
                                    className="inline-flex items-center gap-1 text-sm text-[var(--primary)] font-medium hover:underline"
                                >
                                    View Service <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            {recommendation.secondary && (
                                <div className="p-4 rounded-xl bg-[var(--secondary)]">
                                    <p className="text-xs text-[var(--muted)] font-bold uppercase mb-1">Also Consider</p>
                                    <h4 className="font-bold">{recommendation.secondary.name}</h4>
                                    <p className="text-sm text-[var(--muted)]">{recommendation.secondary.reason}</p>
                                </div>
                            )}

                            <button
                                onClick={() => { setRecommendation(null); setInput(''); }}
                                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                            >
                                ← Try another query
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
