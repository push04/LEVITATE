import { type ReactNode } from 'react';

type Variant = 'gold' | 'new' | 'progress' | 'closed' | 'warn' | 'neutral' | 'active';

const variantStyles: Record<Variant, string> = {
  gold: 'bg-[rgba(201,165,90,0.12)] border-[rgba(201,165,90,0.28)] text-[var(--gold-base)]',
  new: 'bg-blue-50 border-blue-200 text-blue-700',
  progress: 'bg-blue-50 border-blue-200 text-blue-700',
  closed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  warn: 'bg-red-50 border-red-200 text-red-700',
  neutral: 'bg-gray-100 border-gray-200 text-gray-600',
  active: 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

interface Props {
  variant?: Variant;
  children: ReactNode;
}

export default function StatusBadge({ variant = 'neutral', children }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]}`}>
      {children}
    </span>
  );
}
