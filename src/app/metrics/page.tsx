import type { Metadata } from 'next';
import MetricsClient from './MetricsClient';
import { BRAND_TAGLINE } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Metrics | LevitateOS',
  description: BRAND_TAGLINE,
  openGraph: {
    title: 'Metrics | LevitateOS',
    description: BRAND_TAGLINE,
    images: [
      {
        url: 'https://levitatelabs.online/api/og?title=Metrics&subtitle=LevitateOS',
        width: 1200,
        height: 630,
        alt: 'Metrics | LevitateOS',
      },
    ],
  },
};

export default function MetricsPage() {
  return <MetricsClient />;
}

