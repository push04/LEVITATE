'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function Toast({
  visible,
  message,
}: {
  visible: boolean;
  message: string;
}) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          className="fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-lg)]"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--gold-glow)] text-[var(--gold-bright)]">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span>{message}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
