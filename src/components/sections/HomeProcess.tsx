'use client';

import { useEffect, useRef } from 'react';
import { useReveal, useRevealChildren } from '@/hooks/useReveal';
import s from '@/styles/home.module.css';

const STEPS = [
  {
    num: 'Step 01',
    title: 'We map your operations',
    body: 'A 45-minute call. We understand your business, your bottlenecks, your tools.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 2C7.2 2 5 4.4 5 7.4c0 3.7 5 10.6 5 10.6s5-6.9 5-10.6C15 4.4 12.8 2 10 2z"/>
        <circle cx="10" cy="7.5" r="1.5"/>
      </svg>
    ),
  },
  {
    num: 'Step 02',
    title: 'We configure your OS',
    body: 'LevitateOS is set up with your branding, your workflows, your integrations.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="2"/>
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/>
      </svg>
    ),
  },
  {
    num: 'Step 03',
    title: 'You run. We monitor.',
    body: 'Your team gets onboarded. Our AI agents run in the background. Weekly check-ins.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="7"/>
        <path d="M8 7l5 3-5 3V7z" fill="currentColor" stroke="none" opacity="0.7"/>
      </svg>
    ),
  },
];

export default function HomeProcess() {
  const head = useReveal();
  const grid = useRevealChildren();
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && lineRef.current) {
          lineRef.current.style.transition = 'transform 1.2s cubic-bezier(0.16,1,0.3,1)';
          lineRef.current.style.transform = 'scaleX(1)';
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (lineRef.current?.parentElement) obs.observe(lineRef.current.parentElement);
    return () => obs.disconnect();
  }, []);

  return (
    <section className={s.processSection}>
      <div className={s.container}>
        <div ref={head.ref} className={`${s.reveal} ${head.visible ? s.revealed : ''}`}>
          <span className={s.sectionLabel}>How We Work</span>
          <h2 className={s.processHeadline}>Up and running in 7 days.</h2>
        </div>
        <div className={s.processGrid} ref={grid.ref}>
          <div className={s.processTimeline}>
            <div className={s.processTimelineFill} ref={lineRef} />
          </div>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              className={`${s.processStep} ${s.reveal} ${grid.visible ? s.revealed : ''}`}
              style={{ transitionDelay: grid.visible ? `${i * 0.15}s` : '0s' }}
            >
              <div className={s.stepDot} />
              <div className={s.iconWrap}>{step.icon}</div>
              <span className={s.stepNum}>{step.num}</span>
              <h3 className={s.stepTitle}>{step.title}</h3>
              <p className={s.stepBody}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
