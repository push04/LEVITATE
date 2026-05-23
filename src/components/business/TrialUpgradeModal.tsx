'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

export default function TrialUpgradeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Upgrade required"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Close upgrade modal"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 10, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-[520px] rounded-[18px] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-lg)]"
          >
            <div className="type-heading text-[var(--text-primary)]">Upgrade to unlock this action</div>
            <p className="mt-3 type-body text-[var(--text-secondary)]">
              This action is disabled in trial mode. Upgrade to enable messaging, proposals, deployments, exports, and invoice tools.
            </p>

            <div className="mt-5 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
              <div className="type-subheading text-[var(--text-tertiary)]">Upgrade options</div>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">
                Pricing is visible inside checkout. Payment is handled via Razorpay.
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-[10px] border border-[var(--border-default)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-overlay)]"
              >
                Not now
              </button>
              <Link
                href="/business/dashboard/subscribe"
                className="inline-flex items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] px-4 py-2 text-sm font-semibold text-[var(--text-inverse)] hover:brightness-105"
              >
                Upgrade with Razorpay
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

