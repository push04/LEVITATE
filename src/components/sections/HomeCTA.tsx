import Link from 'next/link';
import s from '@/styles/home.module.css';

export default function HomeCTA() {
  return (
    <section className={s.ctaSection} id="contact">
      <div className={s.ctaOrb1} aria-hidden="true" />
      <div className={s.ctaOrb2} aria-hidden="true" />
      <div className={s.container}>
        <h2 className={s.ctaTitle} style={{ animation: 'm-fade-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}>
          Your business, on autopilot.
        </h2>
        <p className={s.ctaSub} style={{ animation: 'm-fade-in 0.7s ease 0.3s both' }}>
          Join 500+ Indian businesses already running on LevitateOS.
        </p>
        <div className={s.ctaBtns} style={{ animation: 'm-fade-in 0.6s ease 0.45s both' }}>
          <Link href="/trial" className={s.ctaBtnPrimary}>
            Start Free Trial — No Credit Card
          </Link>
          <Link href="/demo" className={s.ctaBtnGhost}>
            Schedule a Demo
          </Link>
        </div>
        <p className={s.ctaNote} style={{ animation: 'm-fade-in 0.6s ease 0.6s both' }}>
          Trusted by MSMEs across Delhi, Bengaluru, Mumbai &amp; Patna
        </p>
      </div>
    </section>
  );
}
