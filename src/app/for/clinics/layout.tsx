import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'LevitateOS for Clinics — Fill Empty Appointment Slots. Reduce No-Shows.',
    description: 'Fill empty appointment slots, reduce no-shows, and build your clinic\'s digital presence with WhatsApp-first automation tools.',
    openGraph: {
        title: 'LevitateOS for Clinics — Fill Empty Appointment Slots. Reduce No-Shows.',
        description: 'Fill empty appointment slots, reduce no-shows, and build your clinic\'s digital presence with WhatsApp-first automation tools.',
        url: 'https://levitatelabs.online/for/clinics',
        siteName: 'Levitate Labs',
        type: 'website',
        images: [
            {
                url: 'https://levitatelabs.online/api/og?title=LevitateOS%20for%20Clinics&type=default',
                width: 1200,
                height: 630,
                alt: 'LevitateOS for Clinics',
            },
        ],
    },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
