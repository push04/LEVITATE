'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GRID_BG_STYLE } from '@/lib/styles';
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';
import { LevitateLockup, LevitatePortalGlyph } from '@/components/brand/LevitateLogo';

type AuthMode = 'signin' | 'register';

export default function BusinessLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState({
    ownerName: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const nextPath = useMemo(() => {
    if (typeof window === 'undefined') return '/business/dashboard';
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('next');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/business/dashboard';
    return raw;
  }, []);

  const goNext = () => {
    if (typeof window !== 'undefined') {
      window.location.assign(nextPath);
      return;
    }

    router.push(nextPath);
    router.refresh();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: signInForm.email.trim(),
        password: signInForm.password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        goNext();
        return;
      }

      setError('Unable to start your session. Please try again.');
      setIsLoading(false);
    } catch {
      setError('Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (registerForm.password.length < 8) {
      setError('Password must be at least 8 characters.');
      setIsLoading(false);
      return;
    }

    try {
      const registerResponse = await fetch('/api/business/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerName: registerForm.ownerName,
          companyName: registerForm.companyName,
          email: registerForm.email,
          password: registerForm.password,
        }),
      });

      const registerData = await registerResponse.json();
      if (!registerResponse.ok || !registerData.success) {
        if (registerResponse.status === 409) {
          setMode('signin');
          setSignInForm({
            email: registerForm.email.trim(),
            password: '',
          });
        }
        setError(registerData.error || 'Registration failed.');
        setIsLoading(false);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: registerForm.email.trim(),
        password: registerForm.password,
      });

      if (signInError || !signInData.session) {
        setError(signInError?.message || 'Account created, but automatic sign-in failed. Please sign in manually.');
        setMode('signin');
        setSignInForm({
          email: registerForm.email.trim(),
          password: '',
        });
        setShowPassword(false);
        setIsLoading(false);
        return;
      }

      goNext();
    } catch {
      setError('Registration failed due to a network error.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(196,164,102,0.22),_transparent_30%),radial-gradient(circle_at_right,_rgba(233,196,135,0.08),_transparent_24%),linear-gradient(180deg,_#0c0c0b_0%,_#141414_100%)] text-[#f5f1ea]">
      <div className="absolute inset-0 opacity-20" style={GRID_BG_STYLE} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,197,155,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.04),transparent_28%)]" />

      <ForgotPasswordModal isOpen={showForgot} onClose={() => setShowForgot(false)} />

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
        className="absolute bottom-[-100px] left-[-100px] h-80 w-80 rounded-full border border-[#c8a96e]/10 opacity-30"
      />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 mx-4 w-full max-w-xl">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <div className="mb-8 flex flex-col items-center justify-center gap-4">
            <LevitatePortalGlyph className="h-16 w-16" />
            <div className="text-center">
              <LevitateLockup
                markClassName="hidden"
                className="justify-center"
                wordmarkClassName="text-2xl text-[#f5f1ea]"
                suffix="OS"
              />
              <p className="mt-3 text-sm text-white/72">
                One portal for CRM, leads, automations, mailbox, and business operations.
              </p>
              <p className="mt-2 text-xs leading-5 text-white/55">
                Sign in or create your account, then subscribe inside the dashboard to unlock access.
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                mode === 'signin' ? 'bg-[#c8a96e] text-[#140f07]' : 'text-white/58 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                mode === 'register' ? 'bg-[#c8a96e] text-[#140f07]' : 'text-white/58 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#f5f1ea]">Work Email</label>
                <div className="group relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/38 transition-colors group-focus-within:text-[#c8a96e]" />
                  <input
                    type="email"
                    value={signInForm.email}
                    onChange={(e) => setSignInForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-[#f5f1ea] outline-none transition-all placeholder:text-white/34 focus:border-[#c8a96e]/50 focus:ring-2 focus:ring-[#c8a96e]/15"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#f5f1ea]">Password</label>
                <div className="group relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/38 transition-colors group-focus-within:text-[#c8a96e]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signInForm.password}
                    onChange={(e) => setSignInForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-12 text-[#f5f1ea] outline-none transition-all placeholder:text-white/34 focus:border-[#c8a96e]/50 focus:ring-2 focus:ring-[#c8a96e]/15"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/45 transition-colors hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-300"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8a96e] py-4 font-bold text-[#140f07] shadow-lg shadow-[#c8a96e]/15 transition-all hover:bg-[#d4b37a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <Lock className="h-4 w-4" />
                  </>
                )}
              </motion.button>

              <div className="space-y-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-sm text-white/58 transition-colors hover:text-[#d9c59b]"
                >
                  Forgot password?
                </button>
                <div className="text-sm text-white/58">
                  Need details first?{' '}
                  <Link href="/onboard" className="text-[#c8a96e] transition-colors hover:text-[#e5c487]">
                    View onboarding deck
                  </Link>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#f5f1ea]">Owner Name</label>
                  <div className="group relative">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/38 transition-colors group-focus-within:text-[#c8a96e]" />
                    <input
                      type="text"
                      value={registerForm.ownerName}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                      required
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-[#f5f1ea] outline-none transition-all placeholder:text-white/34 focus:border-[#c8a96e]/50 focus:ring-2 focus:ring-[#c8a96e]/15"
                      placeholder="Owner full name"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#f5f1ea]">Company Name</label>
                  <input
                    type="text"
                    value={registerForm.companyName}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f5f1ea] outline-none transition-all placeholder:text-white/34 focus:border-[#c8a96e]/50 focus:ring-2 focus:ring-[#c8a96e]/15"
                    placeholder="Your company"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#f5f1ea]">Work Email</label>
                <div className="group relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/38 transition-colors group-focus-within:text-[#c8a96e]" />
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-[#f5f1ea] outline-none transition-all placeholder:text-white/34 focus:border-[#c8a96e]/50 focus:ring-2 focus:ring-[#c8a96e]/15"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#f5f1ea]">Password</label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f5f1ea] outline-none transition-all placeholder:text-white/34 focus:border-[#c8a96e]/50 focus:ring-2 focus:ring-[#c8a96e]/15"
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#f5f1ea]">Confirm Password</label>
                  <input
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f5f1ea] outline-none transition-all placeholder:text-white/34 focus:border-[#c8a96e]/50 focus:ring-2 focus:ring-[#c8a96e]/15"
                    placeholder="Repeat password"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-300"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8a96e] py-4 font-bold text-[#140f07] shadow-lg shadow-[#c8a96e]/15 transition-all hover:bg-[#d4b37a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <Lock className="h-4 w-4" />
                  </>
                )}
              </motion.button>

              <p className="text-center text-sm text-white/58">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError('');
                    setSignInForm((prev) => ({ ...prev, email: registerForm.email }));
                  }}
                  className="font-medium text-[#c8a96e] transition-colors hover:text-[#e5c487]"
                >
                  Sign in here
                </button>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
