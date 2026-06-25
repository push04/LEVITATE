'use client';

import { motion } from 'framer-motion';
import { SERVICES } from '@/lib/groq/prompts';
import ServiceCard from './ServiceCard';

interface Props {
  recommendedSlugs: string[];
  selectedSlugs: string[];
  aiRecommendationReason: string;
  onToggle: (slug: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2_ServiceSelection({
  recommendedSlugs,
  selectedSlugs,
  aiRecommendationReason,
  onToggle,
  onNext,
  onBack,
}: Props) {
  const recommended = SERVICES.filter(s => recommendedSlugs.includes(s.slug));
  const others = SERVICES.filter(s => !recommendedSlugs.includes(s.slug));

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-xl font-bold text-gray-900 mb-1">
        {recommended.length > 0
          ? "Here's what we recommend based on your business"
          : 'Select the services that match your goals'}
      </h2>
      {aiRecommendationReason && (
        <p className="text-sm text-gray-500 italic mb-5">{aiRecommendationReason}</p>
      )}
      {!aiRecommendationReason && (
        <p className="text-sm text-gray-400 mb-5">Choose one or more services to continue.</p>
      )}

      {recommended.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-semibold text-violet-700 uppercase tracking-widest mb-3">
            Recommended for you
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommended.map(service => (
              <ServiceCard
                key={service.slug}
                service={service}
                isSelected={selectedSlugs.includes(service.slug)}
                isRecommended
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className="mb-6">
          {recommended.length > 0 && (
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Other services
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {others.map(service => (
              <ServiceCard
                key={service.slug}
                service={service}
                isSelected={selectedSlugs.includes(service.slug)}
                isRecommended={false}
                onToggle={onToggle}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-sm text-gray-500">
          {selectedSlugs.length} service{selectedSlugs.length !== 1 ? 's' : ''} selected
        </span>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={selectedSlugs.length === 0}
            className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-semibold text-sm transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    </motion.div>
  );
}
