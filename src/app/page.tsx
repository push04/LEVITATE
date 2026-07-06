import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import HomeHero from '@/components/sections/HomeHero';
import HomeMarquee from '@/components/sections/HomeMarquee';
import HomeProblem from '@/components/sections/HomeProblem';
import HomeSolution from '@/components/sections/HomeSolution';
import HomeProcess from '@/components/sections/HomeProcess';
import HomeServices from '@/components/sections/HomeServices';
import HomeWork from '@/components/sections/HomeWork';
import HomeStats from '@/components/sections/HomeStats';
import HomeCTA from '@/components/sections/HomeCTA';
import HomeDeveloper from '@/components/sections/HomeDeveloper';
import s from '@/styles/home.module.css';

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
};

const homeSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Levitate Labs',
  url: 'https://levitatelabs.online',
  description: 'Agentic AI and automation agency for Indian businesses.',
  publisher: {
    '@type': 'Organization',
    name: 'Levitate Labs',
    logo: { '@type': 'ImageObject', url: 'https://levitatelabs.online/icon.png' },
  },
};

export default function Home() {
  return (
    <>
      <JsonLd schema={homeSchema} />
      <HomeHero />
      <HomeMarquee />
      <HomeProblem />
      <div className={s.bridge}>
        <div className={s.bridgeLine} />
        <span className={s.bridgeText}>The fix exists.</span>
        <div className={s.bridgeLine} />
      </div>
      <HomeSolution />
      <HomeProcess />
      <HomeServices />
      <div className={s.bridge} style={{ background: '#F0EDE7' }}>
        <div className={s.bridgeLine} />
        <span className={s.bridgeText}>Here&apos;s the proof.</span>
        <div className={s.bridgeLine} />
      </div>
      <HomeWork />
      <HomeStats />
      <div className={s.bridge} style={{ background: '#F0EDE7' }}>
        <div className={s.bridgeLine} />
        <span className={s.bridgeText}>Embed it. Ship it.</span>
        <div className={s.bridgeLine} />
      </div>
      <HomeDeveloper />
      <div className={s.bridge} style={{ background: '#F4F2EE' }}>
        <div className={s.bridgeLine} />
        <span className={s.bridgeText}>Ready to join them?</span>
        <div className={s.bridgeLine} />
      </div>
      <HomeCTA />
    </>
  );
}
