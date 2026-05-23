'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Loader2, Sparkles } from 'lucide-react';

interface FormData {
    name: string;
    email: string;
    budget: string;
    message: string;
}

const budgetOptions = [
    { value: 'under-5k', label: 'Under Rs. 5,000' },
    { value: '5k-15k', label: 'Rs. 5,000 - Rs. 15,000' },
    { value: '15k-50k', label: 'Rs. 15,000 - Rs. 50,000' },
    { value: 'above-50k', label: 'Above Rs. 50,000' },
];

export default function Contact() {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        budget: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [budgetOpen, setBudgetOpen] = useState(false);
    const budgetRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (budgetRef.current && !budgetRef.current.contains(event.target as Node)) {
                setBudgetOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const submitData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                submitData.append(key, value);
            });

            const response = await fetch('/api/contact', {
                method: 'POST',
                body: submitData,
            });

            if (response.ok) {
                setSubmitStatus('success');
                setFormData({
                    name: '',
                    email: '',
                    budget: '',
                    message: '',
                });
            } else {
                throw new Error('Submission failed');
            }
        } catch {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setSubmitStatus('idle'), 5000);
        }
    };

    const selectedBudgetLabel = budgetOptions.find(option => option.value === formData.budget)?.label;

    return (
        <section
            id="contact"
            className="relative overflow-hidden bg-[var(--background)] py-20 text-[var(--foreground)] md:py-28"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(200,169,110,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_24%)]" />

            <div className="relative mx-auto grid max-w-screen-xl grid-cols-1 gap-10 px-6 md:grid-cols-[1.05fr_0.95fr] md:gap-16 md:px-12 lg:gap-24">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="max-w-2xl"
                >
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/55 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-[var(--muted)] shadow-sm backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5 text-[#C8A96E]" />
                        Start a conversation
                    </div>

                    <h2 className="mt-6 font-headline text-[clamp(1.25rem,5vw,2rem)] leading-[0.92] tracking-tight text-[var(--foreground)] md:text-6xl lg:text-7xl">
                        Have an idea?
                        <br />
                        <span className="italic text-[#C8A96E]">Tell us about it.</span>
                    </h2>

                    <p className="mt-6 max-w-xl font-body text-base font-light leading-8 tracking-wide text-[var(--muted)] md:text-lg">
                        Whether you are looking to launch a refined brand presence or architect a system that scales with your team, we will shape the next step with clarity.
                    </p>

                    <div className="mt-10 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-3xl border border-[var(--border)] bg-white/60 p-5 shadow-sm backdrop-blur">
                            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">General inquiries</div>
                            <a
                                href="mailto:hello@levitatelabs.com"
                                className="mt-2 block text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[#C8A96E] dark:hover:text-[#C8A96E]"
                            >
                                hello@levitatelabs.com
                            </a>
                        </div>

                        <div className="rounded-3xl border border-[var(--border)] bg-white/60 p-5 shadow-sm backdrop-blur">
                            <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Typical response time</div>
                            <p className="mt-2 text-sm font-medium text-[var(--muted)]">
                                1 business day or less
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                    className="relative"
                >
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-[32px] border border-[var(--border)] bg-white/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur sm:p-6 lg:p-8"
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className="w-full rounded-2xl border border-[var(--border)] bg-[#F8F5EF] px-4 py-4 font-body text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[#C8A96E] focus:bg-white dark:placeholder:text-white/30 dark:focus:bg-white/10"
                                    placeholder="What is your name?"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className="w-full rounded-2xl border border-[var(--border)] bg-[#F8F5EF] px-4 py-4 font-body text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[#C8A96E] focus:bg-white dark:placeholder:text-white/30 dark:focus:bg-white/10"
                                    placeholder="Your email address?"
                                />
                            </div>
                        </div>

                        <div ref={budgetRef} className="relative mt-4">
                            <label className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                                Budget
                            </label>
                            <button
                                type="button"
                                onClick={() => setBudgetOpen(prev => !prev)}
                                aria-haspopup="listbox"
                                aria-expanded={budgetOpen}
                                className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[#F8F5EF] px-4 py-4 text-left font-body text-[var(--foreground)] outline-none transition-all hover:border-[#C8A96E] focus:border-[#C8A96E]"
                            >
                                <span className={formData.budget ? 'text-[var(--foreground)] ' : 'text-[var(--muted)] '}>
                                    {selectedBudgetLabel ?? 'Expected Budget Range?'}
                                </span>
                                <ChevronDown className={`h-4 w-4 transition-transform ${budgetOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {budgetOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                        transition={{ duration: 0.18, ease: 'easeOut' }}
                                        className="absolute z-20 mt-3 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-2xl shadow-black/10"
                                        role="listbox"
                                    >
                                        {budgetOptions.map(option => {
                                            const active = formData.budget === option.value;
                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => {
                                                        handleInputChange('budget', option.value);
                                                        setBudgetOpen(false);
                                                    }}
                                                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${active
                                                        ? 'bg-[#C8A96E]/10 text-[var(--foreground)] '
                                                        : 'text-[var(--muted)] hover:bg-[var(--background)]  dark:hover:bg-white/5'
                                                        }`}
                                                    role="option"
                                                    aria-selected={active}
                                                >
                                                    <span>{option.label}</span>
                                                    {active && <Check className="h-4 w-4 text-[#C8A96E]" />}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="mt-4">
                            <label className="mb-2 block text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                                Project brief
                            </label>
                            <textarea
                                required
                                rows={5}
                                value={formData.message}
                                onChange={(e) => handleInputChange('message', e.target.value)}
                                className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[#F8F5EF] px-4 py-4 font-body text-[var(--foreground)] outline-none transition-all placeholder:text-[var(--muted)] focus:border-[#C8A96E] focus:bg-white dark:placeholder:text-white/30 dark:focus:bg-white/10"
                                placeholder="Describe your project, timeline, and goals..."
                            />
                        </div>

                        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="group inline-flex min-h-[52px] items-center justify-center gap-3 rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-7 py-3.5 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-[var(--foreground)]" />}
                                <span className="font-label text-xs uppercase tracking-[0.22em] text-[var(--foreground)] transition-colors group-hover:text-[#C8A96E] dark:group-hover:text-[#C8A96E]">
                                    {isSubmitting ? 'Sending...' : 'Submit Inquiry'}
                                </span>
                            </button>

                            <AnimatePresence>
                                {submitStatus !== 'idle' && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={`rounded-full border px-3 py-2 font-body text-xs uppercase tracking-[0.18em] ${submitStatus === 'success'
                                            ? 'border-[#C8A96E]/30 bg-[#C8A96E]/10 text-[#C8A96E]'
                                            : 'border-red-500/20 bg-red-500/10 text-red-400'
                                            }`}
                                    >
                                        {submitStatus === 'success' ? 'Message received.' : 'Error sending message.'}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    </form>
                </motion.div>
            </div>
        </section>
    );
}
