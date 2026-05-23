import { cn } from './utils';

const VARIANTS = {
  new: 'border-[color:rgba(107,127,163,0.3)] bg-[rgba(107,127,163,0.12)] text-[var(--status-new)]',
  contacted: 'border-[color:rgba(184,124,58,0.3)] bg-[rgba(184,124,58,0.12)] text-[var(--status-progress)]',
  progress: 'border-[color:rgba(184,124,58,0.3)] bg-[rgba(184,124,58,0.12)] text-[var(--status-progress)]',
  closed: 'border-[color:rgba(61,122,92,0.3)] bg-[rgba(61,122,92,0.12)] text-[var(--status-closed)]',
  active: 'border-[color:rgba(61,122,92,0.3)] bg-[rgba(61,122,92,0.12)] text-[var(--status-closed)]',
  warn: 'border-[color:rgba(138,92,58,0.3)] bg-[rgba(138,92,58,0.12)] text-[var(--status-warn)]',
  gold: 'border-[var(--border-strong)] bg-[var(--gold-glow)] text-[var(--gold-bright)]',
  neutral: 'border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)]',
} as const;

export default function StatusBadge({
  children,
  variant = 'neutral',
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em]',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
