'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LevitateMark } from '@/components/brand/LevitateLogo';
import { isReservedWorkspaceSlug } from '@/lib/onboarding';
import s from '@/styles/navbar.module.css';

const NAV_LINKS = [
  { label: 'Work', href: '/#work', id: 'work' },
  { label: 'Services', href: '/#services', id: 'services' },
  { label: 'About', href: '/#about', id: 'about' },
  { label: 'Contact', href: '/#contact', id: 'contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (pathname !== '/') return;
    const ids = NAV_LINKS.map(l => l.id);
    const observers: IntersectionObserver[] = [];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-40% 0px -55% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [pathname]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const pathSegments = pathname?.split('/').filter(Boolean) ?? [];
  const rootSegment = pathSegments[0] ?? '';
  const isWorkspaceRoute =
    pathSegments.length === 1 && rootSegment && !isReservedWorkspaceSlug(rootSegment);

  if (
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/onboard') ||
    pathname?.startsWith('/company') ||
    pathname?.startsWith('/business') ||
    pathname?.startsWith('/shared/') ||
    pathname?.startsWith('/site/') ||
    isWorkspaceRoute
  ) {
    return null;
  }

  const close = () => setMenuOpen(false);

  return (
    <>
      <nav className={`${s.nav} ${scrolled ? s.scrolled : ''}`} role="navigation" aria-label="Main navigation">
        <div className={s.inner}>
          <Link href="/" className={s.logo} onClick={close}>
            <LevitateMark className={s.logoMark} />
            <span className={s.logoText}>
              <span className={s.logoName}>Levitate</span>
              <span className={s.logoSuffix}>Labs</span>
            </span>
          </Link>

          <div className={s.links}>
            {NAV_LINKS.map(l => (
              <Link
                key={l.label}
                href={l.href}
                className={`${s.link} ${activeSection === l.id ? s.linkActive : ''}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className={s.actions}>
            <Link href="/business/dashboard" className={s.portalBtn}>Portal</Link>
            <Link href="/onboard" className={s.onboardBtn}>Onboard</Link>
          </div>

          <button
            className={s.hamburger}
            onClick={() => setMenuOpen(p => !p)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span className={`${s.bar} ${menuOpen ? s.barOpen1 : ''}`} />
            <span className={`${s.bar} ${menuOpen ? s.barOpen2 : ''}`} />
            <span className={`${s.bar} ${menuOpen ? s.barOpen3 : ''}`} />
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={`${s.mobileOverlay} ${menuOpen ? s.mobileOverlayOpen : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className={s.mobileLinks}>
          {NAV_LINKS.map(l => (
            <Link key={l.label} href={l.href} className={s.mobileLink} onClick={close}>
              {l.label}
            </Link>
          ))}
          <div className={s.mobileCTAs}>
            <Link href="/business/dashboard" className={s.mobilePortal} onClick={close}>Portal</Link>
            <Link href="/onboard" className={s.mobileOnboard} onClick={close}>Onboard</Link>
          </div>
        </div>
      </div>
    </>
  );
}
