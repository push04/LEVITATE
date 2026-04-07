'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Using client-side supabase

import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';

export default function AdminLogin() {
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
                router.push('/admin/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('Connection error. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 grid-bg" />
            <div className="absolute inset-0 bg-gradient-to-br from-cobalt/10 via-transparent to-orange/10" />

            <ForgotPasswordModal isOpen={showForgot} onClose={() => setShowForgot(false)} />

            {/* Floating Elements */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                className="absolute top-20 left-20 w-64 h-64 border border-[var(--border)] 
                 rounded-full opacity-20"
            />
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
                className="absolute bottom-20 right-20 w-96 h-96 border border-[var(--primary)]/20 
                 rounded-full"
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-md mx-4"
            >
                <div className="glass-card p-8">
                    {/* Logo */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        <motion.div
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.5 }}
                            className="p-3 rounded-xl bg-[var(--primary)]"
                        >
                            <Zap className="w-6 h-6 text-white" />
                        </motion.div>
                        <span className="text-2xl font-bold font-heading">
                            <span className="text-[var(--foreground)]">Levitate</span>
                            <span className="text-[var(--primary)]">Labs</span>
                        </span>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold mb-2">System Access</h1>
                        <p className="text-[var(--muted)] text-sm">
                            Enter your credentials to access LevitateOS
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--secondary)] 
                           border border-[var(--border)] focus:border-[var(--primary)] 
                           focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all"
                                    placeholder="Enter email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-[var(--secondary)] 
                           border border-[var(--border)] focus:border-[var(--primary)] 
                           focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all"
                                    placeholder="Enter password"
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
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-400"
                            >
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">{error}</span>
                            </motion.div>
                        )}

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    Access LevitateOS
                                </>
                            )}
                        </motion.button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => setShowForgot(true)}
                                className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                    </form>

                    {/* Terminal Decoration */}
                    <div className="mt-8 p-4 terminal text-xs">
                        <div className="text-gray-500 mb-1">$ sys_access --user {email || 'guest'}</div>
                        <div className="text-green-400">{isLoading ? 'Authenticating...' : 'Awaiting input...'}</div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
