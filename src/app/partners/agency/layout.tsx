import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Agency Reseller Program — White-Label AI Automation',
    description: 'White-label our platform. Offer AI automation to your clients. Keep the margin.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
