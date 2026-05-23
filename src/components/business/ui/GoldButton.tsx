import { type ReactNode, type ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'ghost' | 'secondary';
  iconLeft?: ReactNode;
  children?: ReactNode;
}

export default function GoldButton({ variant = 'solid', iconLeft, children, className = '', ...rest }: Props) {
  const base = 'inline-flex items-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60';
  const styles =
    variant === 'solid'
      ? 'bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(201,165,90,0.4)]'
      : variant === 'secondary'
      ? 'border border-[rgba(201,165,90,0.3)] bg-[rgba(201,165,90,0.08)] text-[var(--gold-base)] hover:bg-[rgba(201,165,90,0.14)]'
      : 'border border-[var(--border-default)] bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:border-[rgba(201,165,90,0.35)] hover:text-[var(--gold-base)]';

  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {iconLeft}
      {children}
    </button>
  );
}
