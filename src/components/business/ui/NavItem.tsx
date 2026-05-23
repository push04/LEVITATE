import Link from 'next/link';
import { type ElementType } from 'react';

interface Props {
  href: string;
  label: string;
  icon: ElementType;
  active?: boolean;
  onClick?: () => void;
  notificationCount?: number | null;
}

export default function NavItem({ href, label, icon: Icon, active, onClick, notificationCount }: Props) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-[rgba(201,165,90,0.12)] text-[var(--gold-base)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--gold-base)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'}`} strokeWidth={1.5} />
      <span className="flex-1 truncate">{label}</span>
      {typeof notificationCount === 'number' && (
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[rgba(201,165,90,0.18)] px-1.5 text-[10px] font-semibold tabular-nums text-[var(--gold-base)]">
          {notificationCount}
        </span>
      )}
    </Link>
  );
}
