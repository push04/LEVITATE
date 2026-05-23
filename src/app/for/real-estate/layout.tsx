import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'LevitateOS for Real Estate — Stop Losing Leads. Close More Properties.',
    description: 'Stop losing leads and close more properties with lead scoring, WhatsApp drip sequences, and automated proposal PDFs for real estate brokers.',
    openGraph: {
        title: 'LevitateOS for Real Estate — Stop Losing Leads. Close More Properties.',
        description: 'Stop losing leads and close more properties with lead scoring, WhatsApp drip sequences, and automated proposal PDFs for real estate brokers.',
        url: 'https://levitatelabs.online/for/real-estate',
        siteName: 'Levitate Labs',
        type: 'website',
        images: [
            {
                url: 'https://levitatelabs.online/api/og?title=LevitateOS%20for%20Real%20Estate&type=default',
                width: 1200,
                height: 630,
                alt: 'LevitateOS for Real Estate',
            },
        ],
    },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
