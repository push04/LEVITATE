'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { type ContactDetails } from '@/lib/types/intake';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const REFERRAL_OPTIONS = [
  'Google Search',
  'Instagram / Social Media',
  'Referral from someone',
  'LinkedIn',
  'WhatsApp',
  'Attended an event',
  'Other',
];

interface Props {
  contactDetails: ContactDetails;
  onUpdateField: (field: keyof ContactDetails, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3_ContactForm({ contactDetails, onUpdateField, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Partial<Record<keyof ContactDetails, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof ContactDetails, boolean>>>({});

  const validate = () => {
    const e: Partial<Record<keyof ContactDetails, string>> = {};
    if (!contactDetails.businessName.trim() || contactDetails.businessName.trim().length < 2)
      e.businessName = 'At least 2 characters required';
    if (!contactDetails.contactName.trim() || contactDetails.contactName.trim().length < 2)
      e.contactName = 'At least 2 characters required';
    if (!contactDetails.email.trim() || !EMAIL_RE.test(contactDetails.email.trim()))
      e.email = 'Please enter a valid email address';
    if (contactDetails.phone) {
      const digits = contactDetails.phone.replace(/[\s+\-()]/g, '').replace(/^91/, '');
      if (digits && digits.length !== 10) e.phone = 'Phone must be 10 digits';
    }
    return e;
  };

  const handleBlur = (field: keyof ContactDetails) => {
    setTouched(p => ({ ...p, [field]: true }));
    setErrors(validate());
  };

  const handleSubmit = () => {
    setTouched({ businessName: true, contactName: true, email: true, phone: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) onNext();
  };

  const Field = (
    key: keyof ContactDetails,
    placeholder: string,
    type = 'text',
    required = false,
    hint?: string,
  ) => (
    <div key={key}>
      <input
        type={type}
        placeholder={placeholder + (required ? ' *' : '')}
        value={contactDetails[key]}
        onChange={e => onUpdateField(key, e.target.value)}
        onBlur={() => handleBlur(key)}
        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
          touched[key] && errors[key]
            ? 'border-red-400 bg-red-50 focus:border-red-500'
            : 'border-gray-200 bg-white focus:border-violet-500'
        }`}
      />
      {hint && !errors[key] && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {touched[key] && errors[key] && (
        <p className="mt-1 text-xs text-red-500">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-bold text-gray-900 mb-1">Your contact details</h2>
      <p className="text-sm text-gray-400 mb-6">We&apos;ll use this to prepare your custom proposal.</p>

      <div className="space-y-4">
        {Field('businessName', 'Business Name', 'text', true)}
        {Field('contactName', 'Your Name', 'text', true)}
        {Field('email', 'Business Email', 'email', true)}
        {Field('phone', 'Phone Number', 'tel', false, 'Optional · e.g. +91 98765 43210')}
        {Field('website', 'Website / Social Handle', 'text', false)}

        <select
          value={contactDetails.referral}
          onChange={e => onUpdateField('referral', e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 text-sm outline-none bg-white transition-colors"
        >
          <option value="">How did you hear about us?</option>
          {REFERRAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}
