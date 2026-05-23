'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import s from '@/styles/home.module.css';

const TABS = ['Leads', 'Outreach', 'Revenue', 'Reports'] as const;
type Tab = (typeof TABS)[number];

type TabData = { stats: { val: string; label: string }[]; bars: number[]; chartTitle: string };

const DATA: Record<Tab, TabData> = {
  Leads: {
    stats: [
      { val: '24', label: 'Leads Today' },
      { val: '18', label: 'Qualified' },
      { val: '6', label: 'Hot Leads' },
      { val: '₹0.8L', label: 'Pipeline' },
    ],
    bars: [30, 55, 42, 70, 58, 80, 65, 48, 75, 60, 85, 50],
    chartTitle: 'Weekly Leads',
  },
  Outreach: {
    stats: [
      { val: '156', label: 'WA Sent' },
      { val: '47', label: 'Opened' },
      { val: '23', label: 'Replied' },
      { val: '8', label: 'Converted' },
    ],
    bars: [45, 60, 35, 75, 90, 65, 80, 55, 70, 85, 60, 95],
    chartTitle: 'Message Opens',
  },
  Revenue: {
    stats: [
      { val: '₹1.2L', label: 'This Week' },
      { val: '₹4.8L', label: 'This Month' },
      { val: '8', label: 'Proposals' },
      { val: '3', label: 'Deals Won' },
    ],
    bars: [20, 35, 45, 30, 60, 50, 75, 65, 80, 70, 90, 85],
    chartTitle: 'Revenue Trend',
  },
  Reports: {
    stats: [
      { val: '7', label: 'AI Reports' },
      { val: '3', label: 'Insights' },
      { val: '12', label: 'Alerts' },
      { val: '94%', label: 'Health Score' },
    ],
    bars: [80, 70, 85, 75, 90, 65, 80, 70, 85, 95, 75, 88],
    chartTitle: 'Performance',
  },
};

const AUTO_INTERVAL = 3200;

export default function HomeHero() {
  const [activeTab, setActiveTab] = useState<Tab>('Leads');
  const [visible, setVisible] = useState(true);
  const [bars, setBars] = useState(DATA.Leads.bars);
  const [progress, setProgress] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userInteracted = useRef(false);

  const switchTo = useCallback((tab: Tab) => {
    if (tab === activeTab) return;
    setVisible(false);
    setTimeout(() => {
      setActiveTab(tab);
      setBars(DATA[tab].bars);
      setVisible(true);
      setProgress(0);
    }, 160);
  }, [activeTab]);

  const startAuto = useCallback(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);

    progressRef.current = setInterval(() => {
      setProgress(p => Math.min(p + (100 / (AUTO_INTERVAL / 50)), 100));
    }, 50);

    autoRef.current = setInterval(() => {
      setProgress(0);
      setActiveTab(prev => {
        const idx = TABS.indexOf(prev);
        const next = TABS[(idx + 1) % TABS.length];
        setVisible(false);
        setTimeout(() => {
          setBars(DATA[next].bars);
          setVisible(true);
        }, 160);
        return next;
      });
    }, AUTO_INTERVAL);
  }, []);

  useEffect(() => {
    if (!userInteracted.current) startAuto();
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [startAuto]);

  const handleTabClick = (tab: Tab) => {
    userInteracted.current = true;
    if (autoRef.current) clearInterval(autoRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
    switchTo(tab);
  };

  const currentData = DATA[activeTab];

  return (
    <section className={s.hero} id="home">
      <div className={s.heroInner}>
        {/* Left column */}
        <div className={s.heroLeft}>
          <span
            className={s.heroEyebrow}
            style={{ opacity: 0, animation: 'm-fade-in 0.6s ease 0.05s forwards' }}
          >
            Agentic AI for Indian Businesses
          </span>
          <h1
            className={s.heroTitle}
            style={{ opacity: 0, animation: 'm-fade-in 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s forwards' }}
          >
            We run the operations. You run the business.
          </h1>
          <p
            className={s.heroBody}
            style={{ opacity: 0, animation: 'm-fade-in 0.7s ease 0.4s forwards' }}
          >
            LevitateOS automates your leads, follow-ups, payments, and reporting — so your team focuses on growth.
          </p>
          <div
            className={s.heroCTAs}
            style={{ opacity: 0, animation: 'm-fade-in 0.6s ease 0.55s forwards' }}
          >
            <Link href="/trial" className={s.btnPrimary}>Start Free Trial</Link>
            <Link href="/demo" className={s.btnTextLink}>See How It Works →</Link>
          </div>
        </div>

        {/* Right column — interactive dashboard card */}
        <div
          className={s.heroRight}
          style={{ opacity: 0, animation: 'm-fade-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s forwards' }}
        >
          <div className={s.dashCard} aria-label="LevitateOS dashboard preview">
            {/* Header */}
            <div className={s.dashHeader}>
              <span className={s.dashTitle}>LevitateOS</span>
              <span className={s.dashLive}>
                <span className={s.dashDot} />
                <span className={s.dashLiveText}>LIVE</span>
              </span>
            </div>

            {/* Tabs */}
            <div className={s.dashTabs} role="tablist">
              {TABS.map(tab => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`${s.dashTab} ${activeTab === tab ? s.dashTabActive : ''}`}
                  onClick={() => handleTabClick(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Progress bar for auto-rotate */}
            {!userInteracted.current && (
              <div className={s.dashProgress}>
                <div className={s.dashProgressFill} style={{ width: `${progress}%` }} />
              </div>
            )}

            {/* Content — fades on tab switch */}
            <div
              className={`${s.dashBody} ${s.dashContentArea} ${!visible ? s.dashContentHidden : ''}`}
            >
              <div className={s.dashStatsGrid}>
                {currentData.stats.map(stat => (
                  <div key={stat.label} className={s.dashStat}>
                    <div className={s.dashStatVal}>{stat.val}</div>
                    <div className={s.dashStatLabel}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className={s.dashChart}>
                <div className={s.dashChartTitle}>{currentData.chartTitle}</div>
                <div className={s.dashBars}>
                  {bars.map((h, i) => (
                    <div
                      key={i}
                      className={s.dashBar}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div
            className={s.socialProof}
            style={{ opacity: 0, animation: 'm-fade-in 0.6s ease 0.7s forwards' }}
          >
            <div className={s.avatars}>
              {['A', 'R', 'P'].map(l => (
                <div key={l} className={s.avatarCircle}>{l}</div>
              ))}
            </div>
            <p className={s.socialProofText}>
              <strong>500+</strong> businesses onboarded
            </p>
          </div>
        </div>
      </div>

      <div className={s.scrollHint} aria-hidden="true">
        <span className={s.scrollText}>Scroll</span>
        <div className={s.scrollChevron} />
      </div>
    </section>
  );
}
