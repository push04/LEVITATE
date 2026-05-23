import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Careers | Levitate Labs',
  description: 'Join the Levitate Labs family. Help us build the future of business automation in India.',
  openGraph: {
    title: 'Careers | Levitate Labs',
    description: 'Join the Levitate Labs family. Help us build the future of business automation in India.',
    images: [
      {
        url: 'https://levitatelabs.online/api/og?title=Careers&subtitle=LevitateOS',
        width: 1200,
        height: 630,
        alt: 'Careers | Levitate Labs',
      },
    ],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
