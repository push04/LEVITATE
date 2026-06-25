'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Clock, Sparkles } from 'lucide-react';

interface Props {
  onStart: () => void;
}

export default function Step0_Intro({ onStart }: Props) {
  return (
    <motion.div
      key="step0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-7 h-7 text-white" />
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
        Let&apos;s find the right growth plan for your business.
      </h1>

      <p className="text-gray-500 mb-4 leading-relaxed max-w-sm mx-auto text-sm">
        Answer a few quick questions and our AI will recommend exactly which services fit your goals — no filler, no guesswork.
      </p>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-8">
        <Clock className="w-4 h-4" />
        <span>Takes about 3 minutes</span>
      </div>

      <button
        onClick={onStart}
        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0"
      >
        Start — it&apos;s free
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="mt-4 text-xs text-gray-400">
        No commitment. Our team will follow up within 24 hours.
      </p>
    </motion.div>
  );
}
