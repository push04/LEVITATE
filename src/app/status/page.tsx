import type { Metadata } from 'next';
import StatusClient from './StatusClient';
import { BRAND_TAGLINE } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Status | LevitateOS',
  description: BRAND_TAGLINE,
  openGraph: {
    title: 'Status | LevitateOS',
    description: BRAND_TAGLINE,
    images: [
      {
        url: 'https://levitatelabs.online/api/og?title=Status&subtitle=LevitateOS',
        width: 1200,
        height: 630,
        alt: 'Status | LevitateOS',
      },
    ],
  },
};

export default function StatusPage() {
  return <StatusClient />;
}

