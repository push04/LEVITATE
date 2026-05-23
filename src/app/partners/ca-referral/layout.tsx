import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'CA & Accountant Referral Program — Earn 20% Recurring',
    description: 'Refer your SMB clients. Earn 20% of their subscription every month, as long as they stay.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
