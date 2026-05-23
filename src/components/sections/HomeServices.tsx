'use client';

import { useReveal } from '@/hooks/useReveal';
import s from '@/styles/home.module.css';

const WEB = [
  { name: 'Static Development', price: 'From ₹3,000' },
  { name: 'Dynamic Web App', price: 'From ₹15,000' },
  { name: 'LevitateOS Integration', price: 'From ₹8,000' },
  { name: 'SEO & Google Listing', price: 'From ₹5,000' },
  { name: 'Automation Pipeline', price: 'From ₹10,000' },
];

const MECH = [
  { name: '3D CAD Modeling', price: 'From ₹2,000' },
  { name: 'Technical Documentation', price: 'From ₹1,500' },
  { name: 'Product Design Consulting', price: 'Custom' },
];

function ServiceRow({ name, price }: { name: string; price: string }) {
  return (
    <div className={s.serviceRow}>
      <span className={s.serviceArrow} aria-hidden="true">→</span>
      <span className={s.serviceName}>{name}</span>
      <span className={s.servicePrice}>{price}</span>
    </div>
  );
}

export default function HomeServices() {
  const head = useReveal();
  const table = useReveal();

  return (
    <section className={s.servicesSection} id="services">
      <div className={s.container}>
        <div ref={head.ref} className={`${s.reveal} ${head.visible ? s.revealed : ''}`}>
          <span className={s.sectionLabel}>Our Craft</span>
          <h2 className={s.sectionHeadline}>Beyond the OS.</h2>
          <p className={s.servicesSubhead}>Custom work for businesses that need more.</p>
        </div>
        <div
          ref={table.ref}
          className={`${s.servicesTable} ${s.reveal} ${table.visible ? s.revealed : ''}`}
        >
          <div className={s.servicesCategory}>
            <span className={s.servicesCategoryLabel}>Web</span>
          </div>
          <div className={s.servicesRows}>
            {WEB.map(r => <ServiceRow key={r.name} {...r} />)}
          </div>
          <div className={s.servicesCategory}>
            <span className={s.servicesCategoryLabel}>Mechanical</span>
          </div>
          <div className={s.servicesRows}>
            {MECH.map(r => <ServiceRow key={r.name} {...r} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
