'use client';

import { useReveal, useRevealChildren } from '@/hooks/useReveal';
import s from '@/styles/home.module.css';

const CARDS = [
  {
    num: '01',
    title: 'Leads fall through the cracks',
    body: 'Your sales team follows up on WhatsApp manually. Deals are missed. No one knows the pipeline.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4h14l-5 6v5l-4-2V10L3 4z"/>
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Finance is always a mess',
    body: 'Invoices on Excel, payments on Razorpay, GST filings on pen and paper. Nothing talks to each other.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 14l4-4 3 3 4-5 3-2"/><path d="M3 17h14"/>
        <path d="M15 7l2-2"/><path d="M15 5h2v2"/>
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Growth stalls at 10 people',
    body: "You can't afford a CRM, an automation team, and a data analyst. So you do it all yourself.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
        <path d="M14 4l2 2-2 2"/>
      </svg>
    ),
  },
];

export default function HomeProblem() {
  const head = useReveal();
  const grid = useRevealChildren();

  return (
    <section className={s.problemSection}>
      <div className={s.container}>
        <div
          ref={head.ref}
          className={`${s.sectionHead} ${s.reveal} ${head.visible ? s.revealed : ''}`}
        >
          <span className={s.sectionLabel}>The Problem</span>
          <h2 className={s.sectionHeadline}>
            Indian businesses are drowning in manual work.
          </h2>
        </div>
        <div className={s.problemGrid} ref={grid.ref}>
          {CARDS.map((c, i) => (
            <article
              key={c.num}
              className={`${s.problemCard} ${s.reveal} ${grid.visible ? s.revealed : ''}`}
              style={{ transitionDelay: grid.visible ? `${i * 0.12}s` : '0s' }}
            >
              <span className={s.problemNum} aria-hidden="true">{c.num}</span>
              <div className={s.iconWrap}>{c.icon}</div>
              <h3 className={s.problemCardTitle}>{c.title}</h3>
              <p className={s.problemCardBody}>{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
