'use client';

import { Check } from 'lucide-react';
import { type IntakeService, type ServiceCategory } from '@/lib/types/intake';

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  social_media: 'bg-blue-100 text-blue-800',
  marketplace:  'bg-amber-100 text-amber-800',
  pr:           'bg-purple-100 text-purple-800',
  lead_gen:     'bg-green-100 text-green-800',
  analytics:    'bg-teal-100 text-teal-800',
  reputation:   'bg-rose-100 text-rose-800',
  support:      'bg-gray-100 text-gray-700',
};

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  social_media: 'Social Media',
  marketplace:  'Marketplace',
  pr:           'PR & Media',
  lead_gen:     'Lead Gen',
  analytics:    'Analytics',
  reputation:   'Reputation',
  support:      'Support',
};

interface Props {
  service: IntakeService;
  isSelected: boolean;
  isRecommended: boolean;
  onToggle: (slug: string) => void;
}

export default function ServiceCard({ service, isSelected, isRecommended, onToggle }: Props) {
  return (
    <div
      onClick={() => onToggle(service.slug)}
      className={`relative p-4 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
        isSelected
          ? 'border-violet-500 bg-violet-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-sm'
      }`}
    >
      {isRecommended && (
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold tracking-wide">
          Recommended
        </span>
      )}

      <div className="absolute top-3 right-3">
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-300'
        }`}>
          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      </div>

      <div className={isRecommended ? 'mt-5 mb-2' : 'mb-2'}>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${CATEGORY_COLORS[service.category]}`}>
          {CATEGORY_LABELS[service.category]}
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 pr-6">{service.name}</h3>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{service.description}</p>
    </div>
  );
}
