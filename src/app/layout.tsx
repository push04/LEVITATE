import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import LayoutShell from '@/components/LayoutShell';
import JsonLd from '@/components/JsonLd';

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Levitate Labs - Agentic AI for Indian Businesses',
  description:
    'LevitateOS automates your leads, follow-ups, payments, and reporting. WhatsApp-first AI business operating system for Indian MSMEs.',
  openGraph: {
    title: 'Levitate Labs - Agentic AI for Indian Businesses',
    description: 'LevitateOS: WhatsApp-first AI business OS for Indian businesses.',
    url: 'https://levitatelabs.online',
    siteName: 'Levitate Labs',
    images: [
      {
        url: 'https://levitatelabs.online/api/og?title=Levitate%20Labs&type=default',
        width: 1200,
        height: 630,
        alt: 'Levitate Labs - Agentic AI for Indian Businesses',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Levitate Labs - Agentic AI for Indian Businesses',
    description: 'LevitateOS: WhatsApp-first AI business OS for Indian businesses.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600&display=swap"
          rel="stylesheet"
        />
        <JsonLd
          schema={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Levitate Labs',
            url: 'https://levitatelabs.online',
            description: 'Agentic AI and automation agency for Indian businesses.',
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
