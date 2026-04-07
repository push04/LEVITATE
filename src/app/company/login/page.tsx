'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, Building2, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';

export default function CompanyLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgot, setShowForgot] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                setIsLoading(false);
                return;
            }

            if (data.session) {
                router.push('/company/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('Connection error. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--background)]">
            {/* Background */}
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-tl from-indigo-500/10 via-transparent to-[var(--background)]" />

            <ForgotPasswordModal isOpen={showForgot} onClose={() => setShowForgot(false)} />

            {/* Floating Elements */}
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
                className="absolute bottom-[-100px] left-[-100px] w-80 h-80 border border-indigo-500/20 
                 rounded-full opacity-30"
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                <div className="glass-card p-8 border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                    {/* Logo */}
                    <div className="flex flex-col items-center justify-center gap-4 mb-8">
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.3 }}
                            className="p-4 rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/30"
                        >
                            <Building2 className="w-8 h-8 text-white" />
                        </motion.div>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold font-heading mb-1">Company Portal</h1>
                            <p className="text-[var(--muted)] text-sm">
                                Manage your projects and deliverables
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">Work Email</label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)] group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--secondary)] 
                            border border-[var(--border)] focus:border-indigo-500 
                            focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-[var(--muted)]/50"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--foreground)]">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)] group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-[var(--secondary)] 
                            border border-[var(--border)] focus:border-indigo-500 
                            focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-[var(--muted)]/50"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] 
                            hover:text-[var(--foreground)] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm"
                            >
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold 
                                     shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 
                                     disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <Lock className="w-4 h-4" />
                                </>
                            )}
                        </motion.button>

                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => setShowForgot(true)}
                                className="text-sm text-[var(--muted)] hover:text-indigo-500 transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
