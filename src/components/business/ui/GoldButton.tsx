'use client';

import { motion } from 'framer-motion';
import { cn } from './utils';

type GoldButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export default function GoldButton({
  className,
  variant = 'primary',
  iconLeft,
  iconRight,
  children,
  ...props
}: GoldButtonProps) {
  const baseClassName =
    'inline-flex items-center justify-center gap-2 rounded-[10px] px-5 py-3 text-sm font-semibold outline-none';

  const variantClassName =
    variant === 'primary'
      ? 'bg-[linear-gradient(135deg,var(--gold-base),var(--gold-muted))] text-[var(--text-inverse)] shadow-[0_4px_16px_rgba(201,165,90,0.3),0_1px_3px_rgba(0,0,0,0.4)] hover:brightness-105'
      : variant === 'secondary'
        ? 'border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-overlay)]'
        : 'border border-[var(--border-default)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]';

  return (
    <motion.button
      whileHover={{ y: -1, scale: variant === 'primary' ? 1.02 : 1 }}
      whileTap={{ scale: 0.985 }}
      className={cn(baseClassName, variantClassName, className)}
      {...props}
    >
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </motion.button>
  );
}
