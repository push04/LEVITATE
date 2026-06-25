'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { SERVICES } from '@/lib/groq/prompts';
import { type WizardState } from '@/lib/types/intake';

interface Props {
  state: WizardState;
  onSubmit: () => void;
  onBack: () => void;
}

export default function Step4_Confirmation({ state, onSubmit, onBack }: Props) {
  const {
    selectedSlugs,
    contactDetails,
    aiConfirmationMessage,
    aiNextStepsMessage,
    isSubmitting,
    submitError,
    submittedLeadId,
  } = state;

  const selectedServices = SERVICES.filter(s => selectedSlugs.includes(s.slug));

  if (submittedLeadId) {
    return (
      <motion.div
        key="success"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">We&apos;ve received your request!</h2>
        <p className="text-gray-500 max-w-xs mx-auto text-sm">
          Our team will review your requirements and reach out within 24 business hours to discuss a tailored proposal.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-bold text-gray-900 mb-4">Your request summary</h2>

      {/* AI confirmation card */}
      <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 mb-5">
        {aiConfirmationMessage ? (
          <>
            <p className="text-sm text-gray-800 leading-relaxed mb-2">{aiConfirmationMessage}</p>
            {aiNextStepsMessage && (
              <p className="text-sm text-indigo-700 font-medium">{aiNextStepsMessage}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-700">
            Thank you for reaching out! Our team will review your selected services and get back to you within 24 business hours.
          </p>
        )}
      </div>

      {/* Selected services */}
      <div className="mb-5">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
          Your selected services
        </p>
        <div className="flex flex-wrap gap-2">
          {selectedServices.map(s => (
            <span
              key={s.slug}
              className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-800 text-xs font-semibold"
            >
              {s.name}
            </span>
          ))}
        </div>
      </div>

      {/* Contact summary */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 mb-6">
        <p className="text-sm font-semibold text-gray-900">{contactDetails.businessName}</p>
        <p className="text-sm text-gray-500">{contactDetails.contactName} · {contactDetails.email}</p>
      </div>

      {submitError && (
        <p className="text-sm text-red-500 mb-4 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{submitError}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold text-sm transition-all"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
          ) : (
            'Send my request to Levitate Labs'
          )}
        </button>
      </div>

      <p className="text-xs text-center text-gray-400 mt-3">
        By submitting, you agree to be contacted by our team via email or phone.
      </p>
    </motion.div>
  );
}
