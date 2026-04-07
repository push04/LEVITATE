'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginSelection() {
    const router = useRouter();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: 'spring',
                stiffness: 100
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--background)]">
            {/* Background Effects */}
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--secondary)]/5" />

            <motion.div
                className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[var(--primary)]/10 rounded-full blur-3xl"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 8, repeat: Infinity }}
            />

            <motion.div
                className="relative z-10 w-full max-w-4xl mx-auto px-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center justify-center p-3 rounded-2xl bg-[var(--primary)] mb-6 shadow-lg shadow-[var(--primary)]/20"
                    >
                        <Zap className="w-8 h-8 text-white" />
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-bold font-heading mb-4">
                        Welcome to <span className="text-gradient">LevitateOS</span>
                    </motion.h1>
                    <motion.p variants={itemVariants} className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
                        Please select your access level to continue to the dashboard.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {/* Admin Card */}
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="group relative"
                    >
                        <Link href="/admin" className="block h-full">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl blur-xl" />
                            <div className="relative h-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 hover:border-[var(--primary)] transition-colors overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                    <ShieldCheck className="w-32 h-32 text-[var(--primary)]" />
                                </div>

                                <div className="relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center mb-6 group-hover:bg-[var(--primary)]/20 transition-colors">
                                        <ShieldCheck className="w-6 h-6 text-[var(--primary)]" />
                                    </div>

                                    <h3 className="text-2xl font-bold mb-2">Administrator</h3>
                                    <p className="text-[var(--muted)] mb-6">
                                        Access global system controls, user management, and platform analytics.
                                    </p>

                                    <div className="flex items-center text-[var(--primary)] font-medium">
                                        <span>Admin Login</span>
                                        <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Company Card */}
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -5 }}
                        className="group relative"
                    >
                        <Link href="/company/login" className="block h-full">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl blur-xl" />
                            <div className="relative h-full bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 hover:border-indigo-500 transition-colors overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                    <Building2 className="w-32 h-32 text-indigo-500" />
                                </div>

                                <div className="relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-colors">
                                        <Building2 className="w-6 h-6 text-indigo-500" />
                                    </div>

                                    <h3 className="text-2xl font-bold mb-2">Company Partner</h3>
                                    <p className="text-[var(--muted)] mb-6">
                                        Manage your company profile, post projects, and track deliverables.
                                    </p>

                                    <div className="flex items-center text-indigo-500 font-medium">
                                        <span>Company Login</span>
                                        <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                </div>

                <motion.div variants={itemVariants} className="mt-12 text-center">
                    <p className="text-sm text-[var(--muted)]">
                        Not a member yet? <Link href="/#contact" className="text-[var(--primary)] hover:underline">Contact us</Link> to get started.
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}
