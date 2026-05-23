'use client';

import { useEffect, useRef, useState } from 'react';
import { useReveal } from '@/hooks/useReveal';
import s from '@/styles/home.module.css';

const MODULES = [
  {
    num: '01', name: 'Leads', title: 'Lead Engine',
    body: 'Capture leads from WhatsApp, Instagram, and forms. Auto-qualify and route. Never lose a lead again.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4h14l-5 6v5l-4-2V10L3 4z"/>
      </svg>
    ),
  },
  {
    num: '02', name: 'Outreach', title: 'Outreach Automation',
    body: 'Personalised WhatsApp and email sequences. Automated follow-ups based on behaviour. Replies handled by AI.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 4h12a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 3V5a1 1 0 011-1z"/>
        <line x1="10" y1="8" x2="10" y2="10"/><circle cx="10" cy="11.5" r="0.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    num: '03', name: 'Payments', title: 'Proposals & Payments',
    body: 'Send proposals in one click. Collect payments via Razorpay. Auto-issue GST invoices.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="7"/>
        <path d="M7 7h3.5a1.5 1.5 0 010 3H7m0 0h3.5L13 13M7 7v6"/>
      </svg>
    ),
  },
  {
    num: '04', name: 'Intel', title: 'Market Intelligence',
    body: 'AI researches your competitors, your market, and your customers. Weekly reports delivered to WhatsApp.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 14l4-4 3 3 4-5 3-2"/><path d="M3 17h14"/>
      </svg>
    ),
  },
  {
    num: '05', name: 'Legal', title: 'Legal & Compliance',
    body: 'Delayed payment notices, legal drafts, and MSME compliance — powered by Indian law modules.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 3v14M7 17h6"/><path d="M5 7l-2 4h4L5 7zM15 7l-2 4h4l-2-4z"/>
        <path d="M5 7h10"/>
      </svg>
    ),
  },
];

function DashContent({ active }: { active: number }) {
  if (active === 0) return (
    <>
      {[
        { text: 'Rajan Sharma — Hot Lead', badge: 'NEW', green: true },
        { text: 'Priya Exports — Follow-up Due', badge: 'TODAY', amber: true },
        { text: 'Delhi Auto Parts — Proposal Sent', badge: 'SENT', gold: true },
        { text: 'Kavita Clinics — Payment Pending', badge: 'ACTION', red: true },
      ].map((row, i) => (
        <div key={i} className={s.mockupRow}>
          <span className={s.mockupRowDot} />
          <span className={s.mockupRowText}>{row.text}</span>
          <span className={s.mockupRowBadge} style={
            row.green ? { color: '#22c55e', background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' } :
            row.amber ? { color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' } :
            row.gold  ? { color: '#B08D57', background: 'rgba(176,141,87,0.1)', borderColor: 'rgba(176,141,87,0.2)' } :
                        { color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }
          }>{row.badge}</span>
        </div>
      ))}
    </>
  );

  if (active === 1) return (
    <div className={s.waThread}>
      {[
        { msg: 'Hi Rajan, following up on your enquiry about our CRM plan...', sent: false },
        { msg: 'Yes! Very interested. Can you share pricing?', sent: true },
        { msg: 'Sending you the proposal now 📎 Check WhatsApp!', sent: false },
      ].map((m, i) => (
        <div key={i} className={`${s.waBubble} ${m.sent ? s.waBubbleSent : s.waBubbleRecv}`}>
          <span className={s.waBubbleText}>{m.msg}</span>
        </div>
      ))}
      <div className={s.waTyping}><span /><span /><span /></div>
    </div>
  );

  if (active === 2) return (
    <>
      {[
        { id: 'INV-2024-001', amount: '₹45,000', status: 'PAID', color: '#22c55e' },
        { id: 'INV-2024-002', amount: '₹28,500', status: 'PENDING', color: '#f59e0b' },
        { id: 'INV-2024-003', amount: '₹67,000', status: 'OVERDUE', color: '#ef4444' },
      ].map((inv) => (
        <div key={inv.id} className={s.mockupRow}>
          <span className={s.mockupRowText} style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{inv.id}</span>
          <span className={s.mockupRowText}>{inv.amount}</span>
          <span className={s.mockupRowBadge} style={{ color: inv.color, background: `${inv.color}18`, borderColor: `${inv.color}33` }}>
            {inv.status}
          </span>
        </div>
      ))}
    </>
  );

  if (active === 3) return (
    <div className={s.intelCard}>
      <div className={s.intelRow}>
        <span className={s.mockupRowText}>Competitor mentions</span>
        <span style={{ color: '#B08D57', fontWeight: 600, fontSize: '0.9rem' }}>7</span>
      </div>
      <div className={s.intelBar}>
        <div className={s.intelBarFill} style={{ width: '72%' }} />
      </div>
      <div className={s.intelInsights}>
        <p className={s.intelInsight}>↑ Competitor pricing up 12% this week</p>
        <p className={s.intelInsight}>{`→ Trending: "AI automation MSME"`}</p>
      </div>
    </div>
  );

  return (
    <div className={s.legalPreview}>
      <div className={s.legalBadge}>DRAFT</div>
      <p className={s.legalText}>
        LEGAL NOTICE — Under Section 138 of the Negotiable Instruments Act, 2002, you are hereby notified that the cheque bearing No. 004512 dated...
      </p>
      <p className={s.legalMeta}>Generated by LevitateOS Legal Module</p>
    </div>
  );
}

export default function HomeSolution() {
  const [active, setActive] = useState(0);
  const [contentKey, setContentKey] = useState(0);
  const moduleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const head = useReveal();

  useEffect(() => {
    const observers = MODULES.map((_, i) => {
      const el = moduleRefs.current[i];
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActive(i);
            setContentKey(k => k + 1);
          }
        },
        { threshold: 0.4 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o?.disconnect());
  }, []);

  return (
    <section className={s.solutionSection} id="about">
      <div className={s.container}>
        <div
          ref={head.ref}
          className={`${s.reveal} ${head.visible ? s.revealed : ''}`}
        >
          <span className={s.sectionLabel}>The Solution</span>
          <h2 className={s.solutionHeadline}>
            One OS for everything your business runs on.
          </h2>
        </div>

        <div className={s.solutionGrid}>
          <div className={s.solutionLeft}>
            <div className={s.solutionMockup} aria-hidden="true">
              <div className={s.mockupHeader}>
                <span className={s.mockupDot} />
                <span className={s.mockupDot} />
                <span className={s.mockupDot} />
                <span className={s.mockupTitle}>LevitateOS</span>
              </div>
              <div className={s.mockupNav}>
                {MODULES.map((m, i) => (
                  <span key={m.num} className={`${s.mockupNavItem} ${i === active ? s.activeModule : ''}`}>
                    {m.name}
                  </span>
                ))}
              </div>
              <div className={s.mockupContent} key={contentKey} style={{ animation: 'm-fade-in 0.3s ease forwards' }}>
                <DashContent active={active} />
              </div>
            </div>
          </div>

          <div className={s.solutionRight}>
            {MODULES.map((m, i) => (
              <div key={m.num} className={s.moduleBlock} ref={el => { moduleRefs.current[i] = el; }}>
                <div className={s.moduleHeader}>
                  <div className={s.iconWrapSm}>{m.icon}</div>
                  <div className={s.moduleNum}>{m.num} — {m.name}</div>
                </div>
                <h3 className={s.moduleTitle}>{m.title}</h3>
                <p className={s.moduleBody}>{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
