import { type ReactNode } from 'react';

type Variant = 'gold' | 'new' | 'progress' | 'closed' | 'warn' | 'neutral' | 'active';

const variantStyles: Record<Variant, string> = {
  gold: 'bg-[rgba(201,165,90,0.12)] border-[rgba(201,165,90,0.28)] text-[var(--gold-base)]',
  new: 'bg-[rgba(100,130,200,0.1)] border-[rgba(100,130,200,0.25)] text-blue-400',
  progress: 'bg-[rgba(96,165,250,0.1)] border-[rgba(96,165,250,0.25)] text-blue-400',
  closed: 'bg-[rgba(52,211,153,0.1)] border-[rgba(52,211,153,0.25)] text-emerald-400',
  warn: 'bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.25)] text-red-400',
  neutral: 'bg-[var(--border-default)] border-transparent text-[var(--text-tertiary)]',
  active: 'bg-[rgba(52,211,153,0.08)] border-[rgba(52,211,153,0.2)] text-emerald-400',
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
