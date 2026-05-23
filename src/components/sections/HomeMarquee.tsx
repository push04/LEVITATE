'use client';

import { useEffect, useRef } from 'react';
import s from '@/styles/home.module.css';

const ITEMS = [
  'WhatsApp Business API',
  'Razorpay Payments',
  'GST Automation',
  'Lead Generation',
  'AI Agents',
  'Email Automation',
  'Market Research',
  'Legal Notices',
  'Supabase',
  'n8n Workflows',
  'LevitateOS',
  'MSME Compliance',
  'CRM Automation',
  'Invoice Tracking',
];

export default function HomeMarquee() {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let x = 0;
    let raf: number;
    const halfWidth = track.scrollWidth / 2;

    const step = () => {
      if (!pausedRef.current) {
        x -= 1.2;
        if (Math.abs(x) >= halfWidth) x = 0;
        track.style.transform = `translateX(${x}px)`;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };
    track.addEventListener('mouseenter', pause);
    track.addEventListener('mouseleave', resume);

    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener('mouseenter', pause);
      track.removeEventListener('mouseleave', resume);
    };
  }, []);

  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className={s.marqueeSection} aria-hidden="true">
      <div className={s.marqueeTrack} ref={trackRef}>
        {doubled.map((item, i) => (
          <span key={i} className={s.marqueeItem}>
            {item}
            <span className={s.marqueeSep}>●</span>
          </span>
        ))}
      </div>
    </div>
  );
}
