'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GRID_BG_STYLE } from '@/lib/styles';
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';
import { LevitateLockup } from '@/components/brand/LevitateLogo';

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
    } catch {
      setError('Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={GRID_BG_STYLE} />
      <div className="absolute inset-0 bg-gradient-to-br from-cobalt/10 via-transparent to-orange/10" />

      <ForgotPasswordModal isOpen={showForgot} onClose={() => setShowForgot(false)} />

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
        className="absolute left-20 top-20 h-64 w-64 rounded-full border border-[var(--border)] opacity-20"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
        className="absolute bottom-20 right-20 h-96 w-96 rounded-full border border-[var(--primary)]/20"
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mx-4 w-full max-w-md">
        <div className="glass-card p-8">
          <div className="mb-8 flex justify-center">
            <LevitateLockup
              markClassName="h-12 w-12 rounded-[16px]"
              wordmarkClassName="text-2xl text-[var(--foreground)]"
              suffix="OS"
              subtitle="Internal systems"
              subtitleClassName="text-[var(--muted)] text-center"
            />
          </div>

          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold">System Access</h1>
            <p className="text-sm text-[var(--muted)]">Enter your credentials to access the internal LevitateOS dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] py-3 pl-12 pr-4 outline-none transition-all focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] py-3 pl-12 pr-12 outline-none transition-all focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl bg-red-500/10 p-4 text-red-400"
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Access LevitateOS
                </>
              )}
            </motion.button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--primary)]"
              >
                Forgot password?
              </button>
            </div>
          </form>

          <div className="terminal mt-8 p-4 text-xs">
            <div className="mb-1 text-gray-500">$ sys_access --user {email || 'guest'}</div>
            <div className="text-green-400">{isLoading ? 'Authenticating...' : 'Awaiting input...'}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

