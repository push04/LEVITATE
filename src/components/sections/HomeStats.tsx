'use client';

import { useEffect, useRef, useState } from 'react';
import s from '@/styles/home.module.css';

const STATS = [
  { end: 500, suffix: '+', prefix: '', label: 'Businesses Served' },
  { end: 2,   suffix: 'Cr+', prefix: '₹', label: 'Revenue Recovered' },
  { end: 16,  suffix: '',  prefix: '', label: 'AI Agents Active' },
  { end: 7,   suffix: '',  prefix: '', label: 'Days to Deploy' },
];

export default function HomeStats() {
  const sectionRef = useRef<HTMLElement>(null);
  const [counts, setCounts] = useState(STATS.map(() => 0));
  const [visible, setVisible] = useState(false);
  const animated = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const run = () => {
      if (animated.current) return;
      animated.current = true;
      setVisible(true);

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setCounts(STATS.map(s => s.end));
        return;
      }

      STATS.forEach((stat, i) => {
        const delay = i * 160;
        const duration = 1600;
        setTimeout(() => {
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setCounts(prev => {
              const next = [...prev];
              next[i] = Math.round(eased * stat.end);
              return next;
            });
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, delay);
      });
    };

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { run(); obs.disconnect(); } },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className={s.statsSection} ref={sectionRef}>
      <div className={s.container}>
        <div className={s.statsBar}>
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`${s.statItem} ${s.reveal} ${visible ? s.revealed : ''}`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <span className={s.statNumber}>
                {stat.prefix && <span className={s.statUnit}>{stat.prefix}</span>}
                {counts[i]}
                {stat.suffix && <span className={s.statUnit}>{stat.suffix}</span>}
              </span>
              <span className={s.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
