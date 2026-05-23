'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GRID_BG_STYLE } from '@/lib/styles';
import { LevitateControlGlyph, LevitateLockup, LevitatePortalGlyph } from '@/components/brand/LevitateLogo';

export default function LoginSelection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)]">
      <div className="absolute inset-0 opacity-30" style={GRID_BG_STYLE} />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--secondary)]/5" />

      <motion.div
        className="absolute right-[-5%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[var(--primary)]/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div
        className="relative z-10 mx-auto w-full max-w-6xl px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="mb-12 text-center">
          <motion.div variants={itemVariants} className="inline-flex">
            <LevitateLockup
              markClassName="h-14 w-14 rounded-[18px]"
              wordmarkClassName="text-4xl text-[var(--foreground)] md:text-5xl"
              subtitle="Choose your operating layer"
              subtitleClassName="text-[var(--muted)]"
            />
          </motion.div>

          <motion.p variants={itemVariants} className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]">
            Pick your operating layer: admin control or the Business dashboard.
          </motion.p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="group relative">
            <Link href="/admin" className="block h-full">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-transparent opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
              <div className="relative h-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 transition-colors hover:border-[var(--primary)]">
                <div className="relative z-10">
                  <LevitateControlGlyph className="h-14 w-14" />
                  <h3 className="mt-6 text-2xl font-bold">Administrator</h3>
                  <p className="mb-6 mt-2 text-[var(--muted)]">Command dashboards, user management, campaign systems, and platform analytics.</p>

                  <div className="flex items-center font-medium text-[var(--primary)]">
                    <span>Admin Login</span>
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ y: -5 }} className="group relative">
            <Link href="/business/login" className="block h-full">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#c8a96e]/20 to-transparent opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
              <div className="relative h-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 transition-colors hover:border-[#c8a96e]/45">
                <div className="relative z-10">
                  <LevitatePortalGlyph className="h-14 w-14" />
                  <h3 className="mt-6 text-2xl font-bold">Business Portal</h3>
                  <p className="mb-6 mt-2 text-[var(--muted)]">Client workspace for onboarding, projects, files, and paid business delivery visibility.</p>

                  <div className="flex items-center font-medium text-[#c8a96e]">
                    <span>Business Login</span>
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="mt-12 text-center text-sm text-[var(--muted)]">
          Need a business workspace first?{' '}
          <Link href="/onboard" className="text-[#c8a96e] transition-colors hover:text-[#e5c487]">
            Start onboarding
          </Link>
          {' '}or{' '}
          <Link href="/#contact" className="text-[var(--primary)] transition-colors hover:underline">
            contact us
          </Link>
          .
        </motion.div>
      </motion.div>
    </div>
  );
}
