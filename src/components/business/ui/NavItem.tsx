'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import styles from './DashboardPrimitives.module.css';
import { cn } from './utils';

export default function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  notificationCount,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  notificationCount?: number | null;
}) {
  return (
    <Link href={href} onClick={onClick} className={cn(styles.navItem, active && styles.navItemActive)}>
      {active ? (
        <motion.span
          layoutId="business-sidebar-active"
          className="absolute inset-0 rounded-[8px] border border-[var(--border-default)] bg-[linear-gradient(135deg,rgba(201,165,90,0.14)_0%,rgba(201,165,90,0.06)_100%)]"
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        />
      ) : null}
      <span className="relative">
        <Icon className={cn('h-4 w-4', active ? 'text-[var(--gold-base)]' : 'text-[var(--text-tertiary)]')} strokeWidth={1.5} />
        {typeof notificationCount === 'number' ? (
          <span className="absolute -right-2.5 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold-base)] text-[10px] font-medium text-[var(--text-inverse)] font-mono">
            {notificationCount}
          </span>
        ) : null}
      </span>
      <span className={cn('relative type-body font-medium', active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>
        {label}
      </span>
    </Link>
  );
}
