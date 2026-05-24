'use client'

import { useState, useEffect } from 'react'

interface SectionContent {
  [key: string]: string | string[]
}

interface Section {
  id: string
  type: string
  label: string
  enabled: boolean
  content: SectionContent
}

interface Theme {
  primary: string
  secondary: string
  accent: string
  bg: string
  text: string
}

interface Font {
  heading: string
  body: string
}

interface Integrations {
  paymentGateway: string
  whatsapp: { enabled: boolean; phone: string }
  booking: boolean
  googleAnalytics: string
  cookieConsent: boolean
  ecommerce: boolean
}

interface Seo {
  title: string
  description: string
  keywords: string
}

export interface SiteData {
  businessName: string
  template_id: string
  sections: Section[]
  theme: Theme
  font: Font
  integrations: Integrations
  seo: Seo
}

function str(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.join(', ')
  return ''
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x))
  if (typeof v === 'string' && v) return v.split('\n').filter(Boolean)
  return []
}

function NavSection({ section, data }: { section: Section; data: SiteData }) {
  const [open, setOpen] = useState(false)
  const enabledSections = data.sections.filter((s) => s.enabled && s.type !== 'nav')
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${data.theme.primary}33`,
        padding: '0 1.5rem',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <span style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '1.4rem', fontWeight: 700, color: data.theme.primary }}>
          {data.businessName}
        </span>
        <div className="site-nav-links" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {enabledSections.slice(0, 6).map((s) => (
            <a
              key={s.id}
              href={`#section-${s.id}`}
              style={{ color: data.theme.text === '#ffffff' || data.theme.bg === '#000000' ? '#ccc' : '#444', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}
            >
              {s.label}
            </a>
          ))}
          {data.integrations.booking && (
            <a
              href="#section-contact"
              style={{
                padding: '0.45rem 1.1rem',
                background: data.theme.primary,
                color: '#fff',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              Book Now
            </a>
          )}
        </div>
        <button
          className="site-nav-burger"
          onClick={() => setOpen(!open)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: data.theme.primary, fontSize: '1.5rem' }}
          aria-label="Menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>
      {open && (
        <div
          style={{
            background: 'rgba(10,10,10,0.98)',
            padding: '1rem 1.5rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {enabledSections.slice(0, 6).map((s) => (
            <a
              key={s.id}
              href={`#section-${s.id}`}
              onClick={() => setOpen(false)}
              style={{ color: '#ccc', textDecoration: 'none', fontSize: '1rem' }}
            >
              {s.label}
            </a>
          ))}
          {data.integrations.booking && (
            <a
              href="#section-contact"
              onClick={() => setOpen(false)}
              style={{ padding: '0.6rem 1.2rem', background: data.theme.primary, color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: 600, textAlign: 'center' }}
            >
              Book Now
            </a>
          )}
        </div>
      )}
    </nav>
  )
}

function HeroSection({ section, data }: { section: Section; data: SiteData }) {
  return (
    <section
      id={`section-${section.id}`}
      style={{
        background: `linear-gradient(135deg, ${data.theme.bg} 0%, ${data.theme.secondary}22 100%)`,
        padding: '6rem 1.5rem',
        textAlign: 'center',
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: `'${data.font.heading}', serif`,
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
            fontWeight: 700,
            color: data.theme.primary,
            lineHeight: 1.15,
            marginBottom: '1.25rem',
          }}
        >
          {str(section.content.headline) || data.businessName}
        </h1>
        <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', color: data.theme.text, opacity: 0.8, marginBottom: '2.5rem', lineHeight: 1.7 }}>
          {str(section.content.subtext) || str(section.content.subtitle)}
        </p>
        {str(section.content.cta) && (
          <a
            href="#section-contact"
            style={{
              display: 'inline-block',
              padding: '0.9rem 2.2rem',
              background: data.theme.primary,
              color: '#fff',
              borderRadius: '8px',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '1.05rem',
              transition: 'opacity 0.2s',
            }}
          >
            {str(section.content.cta)}
          </a>
        )}
      </div>
    </section>
  )
}

function AboutSection({ section, data }: { section: Section; data: SiteData }) {
  return (
    <section id={`section-${section.id}`} style={{ background: '#fff', padding: '5rem 1.5rem' }}>
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '3rem',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '2.2rem', fontWeight: 700, color: data.theme.primary, marginBottom: '1rem' }}>
            {str(section.content.title) || section.label}
          </h2>
          <p style={{ color: '#444', lineHeight: 1.8, fontSize: '1.05rem' }}>
            {str(section.content.description) || str(section.content.body)}
          </p>
        </div>
        <div
          style={{
            background: `linear-gradient(135deg, ${data.theme.primary}18 0%, ${data.theme.secondary}18 100%)`,
            borderRadius: '16px',
            padding: '3rem 2rem',
            textAlign: 'center',
            border: `1.5px solid ${data.theme.primary}33`,
          }}
        >
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✨</div>
          <p style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '1.3rem', fontWeight: 600, color: data.theme.primary }}>
            {data.businessName}
          </p>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection({ section, data }: { section: Section; data: SiteData }) {
  const features = arr(section.content.features).concat(
    arr(section.content.items)
  ).filter(Boolean)
  const icons = ['⚡', '🎯', '🌟', '🔥', '💎', '🚀', '✅', '🎉']
  return (
    <section id={`section-${section.id}`} style={{ background: data.theme.bg, padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '2.2rem', fontWeight: 700, color: data.theme.primary, textAlign: 'center', marginBottom: '0.75rem' }}>
          {str(section.content.title) || section.label}
        </h2>
        <p style={{ textAlign: 'center', color: data.theme.text, opacity: 0.7, marginBottom: '3rem' }}>
          {str(section.content.subtitle)}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '1.75rem',
                border: `1px solid ${data.theme.primary}22`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{icons[i % icons.length]}</div>
              <p style={{ fontWeight: 600, color: '#1a1a1a', lineHeight: 1.5 }}>{f}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function MenuSection({ section, data }: { section: Section; data: SiteData }) {
  const categories = arr(section.content.categories)
  const items = arr(section.content.items).concat(arr(section.content.menu))
  return (
    <section id={`section-${section.id}`} style={{ background: '#fff', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '2.2rem', fontWeight: 700, color: data.theme.primary, textAlign: 'center', marginBottom: '2.5rem' }}>
          {str(section.content.title) || section.label}
        </h2>
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map((cat, i) => (
              <span
                key={i}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '999px',
                  background: i === 0 ? data.theme.primary : '#f0f0f0',
                  color: i === 0 ? '#fff' : '#333',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                borderRadius: '10px',
                border: `1px solid #e5e5e5`,
                overflow: 'hidden',
              }}
            >
              <div style={{ height: '120px', background: `linear-gradient(135deg, ${data.theme.primary}33, ${data.theme.secondary}33)` }} />
              <div style={{ padding: '1rem' }}>
                <p style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: '0.25rem' }}>{item}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StatsSection({ section, data }: { section: Section; data: SiteData }) {
  const stats = arr(section.content.stats).concat(arr(section.content.items))
  return (
    <section id={`section-${section.id}`} style={{ background: data.theme.primary, padding: '3.5rem 1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '3rem' }}>
        {stats.map((stat, i) => {
          const parts = stat.split(':')
          const label = parts[1] ?? stat
          const value = parts[0] ?? ''
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', fontFamily: `'${data.font.heading}', serif` }}>{value || label}</div>
              {parts.length > 1 && <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', marginTop: '0.25rem' }}>{label}</div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function GallerySection({ section, data }: { section: Section; data: SiteData }) {
  const count = 8
  const gradients = [
    `linear-gradient(135deg, ${data.theme.primary}55, ${data.theme.secondary}55)`,
    `linear-gradient(135deg, ${data.theme.secondary}55, ${data.theme.accent}55)`,
    `linear-gradient(135deg, ${data.theme.accent}55, ${data.theme.primary}55)`,
  ]
  return (
    <section id={`section-${section.id}`} style={{ background: '#fff', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '2.2rem', fontWeight: 700, color: data.theme.primary, textAlign: 'center', marginBottom: '2.5rem' }}>
          {str(section.content.title) || section.label}
        </h2>
        <div style={{ columns: '3 280px', gap: '1rem' }}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              style={{
                height: `${140 + (i % 3) * 60}px`,
                background: gradients[i % gradients.length],
                borderRadius: '10px',
                marginBottom: '1rem',
                display: 'inline-block',
                width: '100%',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection({ section, data }: { section: Section; data: SiteData }) {
  const testimonials = arr(section.content.testimonials).concat(arr(section.content.reviews))
  return (
    <section id={`section-${section.id}`} style={{ background: data.theme.bg, padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '2.2rem', fontWeight: 700, color: data.theme.primary, textAlign: 'center', marginBottom: '2.5rem' }}>
          {str(section.content.title) || section.label}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {testimonials.map((t, i) => {
            const parts = t.split(' — ')
            const quote = parts[0] ?? t
            const author = parts[1] ?? ''
            return (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: '14px',
                  padding: '1.75rem',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                  border: `1px solid ${data.theme.primary}18`,
                }}
              >
                <div style={{ color: data.theme.primary, fontSize: '1.5rem', marginBottom: '0.75rem' }}>★★★★★</div>
                <p style={{ color: '#333', lineHeight: 1.7, marginBottom: '1rem', fontStyle: 'italic' }}>&quot;{quote}&quot;</p>
                {author && <p style={{ fontWeight: 600, color: data.theme.primary, fontSize: '0.9rem' }}>— {author}</p>}
              </div>
            )
          })}
          {testimonials.length === 0 && (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '1.75rem', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', gridColumn: '1/-1', textAlign: 'center', color: '#888' }}>
              Customer reviews coming soon
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function HoursSection({ section, data }: { section: Section; data: SiteData }) {
  const hours = arr(section.content.hours).concat(arr(section.content.schedule))
  const address = str(section.content.address) || str(section.content.location)
  return (
    <section id={`section-${section.id}`} style={{ background: '#fff', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '2.2rem', fontWeight: 700, color: data.theme.primary, textAlign: 'center', marginBottom: '2.5rem' }}>
          {str(section.content.title) || section.label}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
          <div style={{ background: `${data.theme.primary}0e`, borderRadius: '14px', padding: '2rem', border: `1px solid ${data.theme.primary}22` }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: data.theme.primary }}>Hours</h3>
            {hours.length > 0 ? hours.map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #f0f0f0', fontSize: '0.95rem', color: '#333' }}>
                <span>{h}</span>
              </div>
            )) : (
              <p style={{ color: '#888' }}>Contact us for hours</p>
            )}
          </div>
          <div style={{ background: `${data.theme.secondary}0e`, borderRadius: '14px', padding: '2rem', border: `1px solid ${data.theme.secondary}22` }}>
            <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: data.theme.primary }}>Location</h3>
            {address ? (
              <>
                <p style={{ color: '#333', lineHeight: 1.7, marginBottom: '1rem' }}>{address}</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', padding: '0.5rem 1.2rem', background: data.theme.primary, color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  View on Maps
                </a>
              </>
            ) : (
              <p style={{ color: '#888' }}>Address not provided</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function PricingSection({ section, data }: { section: Section; data: SiteData }) {
  const plans = arr(section.content.plans).concat(arr(section.content.packages))
  return (
    <section id={`section-${section.id}`} style={{ background: data.theme.bg, padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '2.2rem', fontWeight: 700, color: data.theme.primary, textAlign: 'center', marginBottom: '0.75rem' }}>
          {str(section.content.title) || section.label}
        </h2>
        <p style={{ textAlign: 'center', color: data.theme.text, opacity: 0.7, marginBottom: '3rem' }}>
          {str(section.content.subtitle)}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(260px, 1fr))`, gap: '1.5rem' }}>
          {plans.map((plan, i) => {
            const parts = plan.split(':')
            const name = parts[0] ?? plan
            const price = parts[1] ?? ''
            const featured = i === 1
            return (
              <div
                key={i}
                style={{
                  background: featured ? data.theme.primary : '#fff',
                  color: featured ? '#fff' : '#1a1a1a',
                  borderRadius: '16px',
                  padding: '2.25rem',
                  boxShadow: featured ? `0 8px 32px ${data.theme.primary}44` : '0 2px 12px rgba(0,0,0,0.07)',
                  border: `1.5px solid ${featured ? 'transparent' : data.theme.primary + '22'}`,
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {featured && (
                  <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: data.theme.accent || '#f59e0b', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
                    POPULAR
                  </span>
                )}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{name}</h3>
                {price && <p style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem', fontFamily: `'${data.font.heading}', serif` }}>{price}</p>}
                <a
                  href="#section-contact"
                  style={{
                    display: 'block',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: featured ? 'rgba(255,255,255,0.2)' : data.theme.primary,
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    marginTop: '0.5rem',
                  }}
                >
                  Get Started
                </a>
              </div>
            )
          })}
          {plans.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888' }}>Pricing details coming soon</div>
          )}
        </div>
      </div>
    </section>
  )
}

function TeamSection({ section, data }: { section: Section; data: SiteData }) {
  const members = arr(section.content.team).concat(arr(section.content.members))
  const colors = [data.theme.primary, data.theme.secondary, data.theme.accent]
  return (
    <section id={`section-${section.id}`} style={{ background: '#fff', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '2.2rem', fontWeight: 700, color: data.theme.primary, textAlign: 'center', marginBottom: '2.5rem' }}>
          {str(section.content.title) || section.label}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '2rem', justifyItems: 'center' }}>
          {members.map((m, i) => {
            const parts = m.split(':')
            const name = parts[0] ?? m
            const role = parts[1] ?? ''
            const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
            return (
              <div key={i} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${colors[i % colors.length]}, ${colors[(i + 1) % colors.length]})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#fff',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  {initials || '👤'}
                </div>
                <p style={{ fontWeight: 600, color: '#1a1a1a', marginBottom: '0.2rem' }}>{name}</p>
                {role && <p style={{ fontSize: '0.85rem', color: '#888' }}>{role}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ContactSection({ section, data }: { section: Section; data: SiteData }) {
  const [status, setStatus] = useState<'idle' | 'sent'>('idle')
  return (
    <section id={`section-${section.id}`} style={{ background: data.theme.bg, padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '2.2rem', fontWeight: 700, color: data.theme.primary, textAlign: 'center', marginBottom: '0.75rem' }}>
          {str(section.content.title) || section.label}
        </h2>
        <p style={{ textAlign: 'center', color: data.theme.text, opacity: 0.7, marginBottom: '3rem' }}>
          {str(section.content.subtitle)}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2.5rem' }}>
          <div>
            {str(section.content.email) && (
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ display: 'block', color: data.theme.primary, marginBottom: '0.2rem' }}>Email</strong>
                <a href={`mailto:${str(section.content.email)}`} style={{ color: '#444', textDecoration: 'none' }}>{str(section.content.email)}</a>
              </div>
            )}
            {str(section.content.phone) && (
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ display: 'block', color: data.theme.primary, marginBottom: '0.2rem' }}>Phone</strong>
                <a href={`tel:${str(section.content.phone)}`} style={{ color: '#444', textDecoration: 'none' }}>{str(section.content.phone)}</a>
              </div>
            )}
            {str(section.content.address) && (
              <div>
                <strong style={{ display: 'block', color: data.theme.primary, marginBottom: '0.2rem' }}>Address</strong>
                <p style={{ color: '#444', lineHeight: 1.6 }}>{str(section.content.address)}</p>
              </div>
            )}
          </div>
          {status === 'idle' ? (
            <form
              onSubmit={(e) => { e.preventDefault(); setStatus('sent') }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <input
                required
                placeholder="Your name"
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '0.95rem', outline: 'none' }}
              />
              <input
                required
                type="email"
                placeholder="Email address"
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '0.95rem', outline: 'none' }}
              />
              <textarea
                rows={4}
                placeholder="Your message"
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '0.95rem', outline: 'none', resize: 'vertical' }}
              />
              <button
                type="submit"
                style={{ padding: '0.8rem', background: data.theme.primary, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
              >
                Send Message
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: `${data.theme.primary}10`, borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
              <p style={{ fontWeight: 600, color: data.theme.primary, fontSize: '1.1rem' }}>Message sent!</p>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>We&apos;ll get back to you soon.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function CtaSection({ section, data }: { section: Section; data: SiteData }) {
  return (
    <section id={`section-${section.id}`} style={{ background: `linear-gradient(135deg, ${data.theme.primary}, ${data.theme.secondary})`, padding: '5rem 1.5rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
          {str(section.content.headline) || str(section.content.title) || section.label}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
          {str(section.content.subtext) || str(section.content.description)}
        </p>
        <a
          href="#section-contact"
          style={{
            display: 'inline-block',
            padding: '0.9rem 2.2rem',
            background: '#fff',
            color: data.theme.primary,
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '1.05rem',
          }}
        >
          {str(section.content.cta) || 'Get Started'}
        </a>
      </div>
    </section>
  )
}

function FaqSection({ section, data }: { section: Section; data: SiteData }) {
  const [open, setOpen] = useState<number | null>(null)
  const faqs = arr(section.content.faqs).concat(arr(section.content.questions))
  return (
    <section id={`section-${section.id}`} style={{ background: '#fff', padding: '5rem 1.5rem' }}>
      <div style={{ maxWidth: '750px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: `'${data.font.heading}', serif`, fontSize: '2.2rem', fontWeight: 700, color: data.theme.primary, textAlign: 'center', marginBottom: '2.5rem' }}>
          {str(section.content.title) || section.label}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {faqs.map((faq, i) => {
            const parts = faq.split('?')
            const question = (parts[0] ?? faq) + (parts[1] !== undefined ? '?' : '')
            const answer = parts.slice(1).join('').replace(/^\s*/, '') || ''
            return (
              <div key={i} style={{ border: `1px solid ${data.theme.primary}22`, borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '1.1rem 1.25rem',
                    background: open === i ? `${data.theme.primary}0e` : '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: 600,
                    fontSize: '0.97rem',
                    color: '#1a1a1a',
                  }}
                >
                  <span>{question}</span>
                  <span style={{ color: data.theme.primary, flexShrink: 0, marginLeft: '1rem' }}>{open === i ? '−' : '+'}</span>
                </button>
                {open === i && answer && (
                  <div style={{ padding: '0 1.25rem 1.1rem', color: '#555', lineHeight: 1.7 }}>{answer}</div>
                )}
              </div>
            )
          })}
          {faqs.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>FAQs coming soon.</p>}
        </div>
      </div>
    </section>
  )
}

function renderSection(section: Section, data: SiteData) {
  if (!section.enabled) return null
  switch (section.type) {
    case 'nav': return <NavSection key={section.id} section={section} data={data} />
    case 'hero': return <HeroSection key={section.id} section={section} data={data} />
    case 'about': return <AboutSection key={section.id} section={section} data={data} />
    case 'features': return <FeaturesSection key={section.id} section={section} data={data} />
    case 'menu':
    case 'categories': return <MenuSection key={section.id} section={section} data={data} />
    case 'stats': return <StatsSection key={section.id} section={section} data={data} />
    case 'gallery': return <GallerySection key={section.id} section={section} data={data} />
    case 'testimonials': return <TestimonialsSection key={section.id} section={section} data={data} />
    case 'hours': return <HoursSection key={section.id} section={section} data={data} />
    case 'pricing': return <PricingSection key={section.id} section={section} data={data} />
    case 'team': return <TeamSection key={section.id} section={section} data={data} />
    case 'contact': return <ContactSection key={section.id} section={section} data={data} />
    case 'cta': return <CtaSection key={section.id} section={section} data={data} />
    case 'faq': return <FaqSection key={section.id} section={section} data={data} />
    default: return null
  }
}

function CookieBanner({ primaryColor }: { primaryColor: string }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#1a1a1a',
        color: '#e5e5e5',
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        zIndex: 9999,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      }}
    >
      <p style={{ margin: 0, fontSize: '0.875rem', maxWidth: '600px' }}>
        We use cookies to improve your experience. By continuing to use this site, you agree to our use of cookies.
      </p>
      <button
        onClick={() => setVisible(false)}
        style={{ padding: '0.5rem 1.25rem', background: primaryColor, color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
      >
        Accept
      </button>
    </div>
  )
}

function WhatsAppButton({ phone }: { phone: string }) {
  const clean = phone.replace(/\D/g, '')
  return (
    <a
      href={`https://wa.me/${clean}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: '#25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
        zIndex: 9998,
        textDecoration: 'none',
        fontSize: '1.75rem',
      }}
    >
      💬
    </a>
  )
}

export default function SiteRenderer({ data }: { data: SiteData }) {
  const fontFamily = data.font.body || 'Inter'
  const headingFont = data.font.heading || 'Inter'

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
  }, [])

  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&family=${encodeURIComponent(headingFont)}:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap`

  return (
    <div style={{ fontFamily: `'${fontFamily}', 'Inter', system-ui, sans-serif`, color: data.theme.text, background: data.theme.bg, minHeight: '100vh' }}>
      <style>{`
        @import url('${googleFontsUrl}');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { margin: 0; }
        @media (max-width: 768px) {
          .site-nav-links { display: none !important; }
          .site-nav-burger { display: block !important; }
        }
        @media (min-width: 769px) {
          .site-nav-burger { display: none !important; }
        }
      `}</style>

      {data.sections.map((section) => renderSection(section, data))}

      <footer style={{ background: '#111', color: '#666', textAlign: 'center', padding: '2rem 1.5rem', fontSize: '0.825rem' }}>
        <p>
          Built with{' '}
          <a href="https://levitatelabs.online" style={{ color: '#C8A96E', textDecoration: 'none' }}>
            LevitateOS
          </a>{' '}
          Website Builder
        </p>
      </footer>

      {data.integrations.whatsapp?.enabled && data.integrations.whatsapp.phone && (
        <WhatsAppButton phone={data.integrations.whatsapp.phone} />
      )}

      {data.integrations.cookieConsent && (
        <CookieBanner primaryColor={data.theme.primary} />
      )}
    </div>
  )
}
