import Link from 'next/link';
import s from '@/styles/home.module.css';

export default function HomeCTA() {
  return (
    <section className={s.ctaSection} id="contact">
      <div className={s.ctaOrb1} aria-hidden="true" />
      <div className={s.ctaOrb2} aria-hidden="true" />
      <div className={s.container}>
        <h2 className={s.ctaTitle} style={{ opacity: 0, animation: 'm-fade-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s forwards' }}>
          Your business, on autopilot.
        </h2>
        <p className={s.ctaSub} style={{ opacity: 0, animation: 'm-fade-in 0.7s ease 0.3s forwards' }}>
          Join 500+ Indian businesses already running on LevitateOS.
        </p>
        <div className={s.ctaBtns} style={{ opacity: 0, animation: 'm-fade-in 0.6s ease 0.45s forwards' }}>
          <Link href="/trial" className={s.ctaBtnPrimary}>
            Start Free Trial — No Credit Card
          </Link>
          <Link href="/demo" className={s.ctaBtnGhost}>
            Schedule a Demo
          </Link>
        </div>
        <p className={s.ctaNote} style={{ opacity: 0, animation: 'm-fade-in 0.6s ease 0.6s forwards' }}>
          Trusted by MSMEs across Delhi, Bengaluru, Mumbai &amp; Patna
        </p>
      </div>
    </section>
  );
}
