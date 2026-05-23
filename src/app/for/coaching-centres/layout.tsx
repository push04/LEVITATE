import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'LevitateOS for Coaching Centres — Turn Inquiries Into Enrollments',
    description: 'Turn inquiries into enrollments with automated admission follow-up, lead pipeline, and seasonal enrollment campaigns for coaching centres.',
    openGraph: {
        title: 'LevitateOS for Coaching Centres — Turn Inquiries Into Enrollments',
        description: 'Turn inquiries into enrollments with automated admission follow-up, lead pipeline, and seasonal enrollment campaigns for coaching centres.',
        url: 'https://levitatelabs.online/for/coaching-centres',
        siteName: 'Levitate Labs',
        type: 'website',
        images: [
            {
                url: 'https://levitatelabs.online/api/og?title=LevitateOS%20for%20Coaching&type=default',
                width: 1200,
                height: 630,
                alt: 'LevitateOS for Coaching Centres',
            },
        ],
    },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
