'use client';

import { useReveal, useRevealChildren } from '@/hooks/useReveal';
import s from '@/styles/home.module.css';

const PROJECTS = [
  { project: 'Delhi Auto Parts', tag: 'Lead Automation', metric: '3× faster lead response time via WhatsApp automation', bold: '3× faster' },
  { project: 'Kavita Wellness Clinic', tag: 'CRM + Payments', metric: '₹4L recovered via automated invoice follow-ups', bold: '₹4L recovered' },
  { project: 'Rajan Exports', tag: 'Market Intelligence', metric: 'Weekly AI reports replaced a ₹35,000/month analyst', bold: 'Weekly AI reports' },
  { project: 'Mumbai Garments SME', tag: 'GST Automation', metric: '40 hours/month saved on GST filing and reporting', bold: '40 hours/month saved' },
  { project: 'Patna Agro Traders', tag: 'Legal & Compliance', metric: '₹2.8L in dues recovered via automated legal notices', bold: '₹2.8L in dues recovered' },
  { project: 'Bengaluru EdTech Startup', tag: 'Automation Pipeline', metric: '12-step onboarding automated end-to-end in 7 days', bold: '12-step onboarding' },
];

export default function HomeWork() {
  const head = useReveal();
  const grid = useRevealChildren();

  return (
    <section className={s.workSection} id="work">
      <div className={s.container}>
        <div ref={head.ref} className={`${s.reveal} ${head.visible ? s.revealed : ''}`}>
          <span className={s.sectionLabel}>Our Work</span>
          <h2 className={s.workSubhead}>Built for builders.</h2>
        </div>
        <div className={s.workGrid} ref={grid.ref}>
          {PROJECTS.map((p, i) => {
            const parts = p.metric.split(p.bold);
            return (
              <article
                key={p.project}
                className={`${s.workCard} ${s.reveal} ${grid.visible ? s.revealed : ''}`}
                style={{ transitionDelay: grid.visible ? `${i * 0.09}s` : '0s' }}
              >
                <div className={s.workCardMeta}>
                  <span className={s.workCardProject}>{p.project}</span>
                  <span className={s.workCardTag}>{p.tag}</span>
                </div>
                <p className={s.workCardMetric}>
                  {parts[0]}<strong>{p.bold}</strong>{parts[1]}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
