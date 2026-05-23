import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'LevitateOS for Restaurants — Get a Professional Website in 24 Hours',
    description: 'Get a professional website in 24 hours and start getting orders online with AI website builder, WhatsApp menu, and Google Business optimization.',
    openGraph: {
        title: 'LevitateOS for Restaurants — Get a Professional Website in 24 Hours',
        description: 'Get a professional website in 24 hours and start getting orders online with AI website builder, WhatsApp menu, and Google Business optimization.',
        url: 'https://levitatelabs.online/for/restaurants',
        siteName: 'Levitate Labs',
        type: 'website',
        images: [
            {
                url: 'https://levitatelabs.online/api/og?title=LevitateOS%20for%20Restaurants&type=default',
                width: 1200,
                height: 630,
                alt: 'LevitateOS for Restaurants',
            },
        ],
    },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
