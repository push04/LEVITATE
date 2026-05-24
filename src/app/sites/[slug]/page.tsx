import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import SiteRenderer, { type SiteData } from './SiteRenderer'

interface PublishedSiteRow {
  id: string
  slug: string
  business_name: string
  template_id: string | null
  sections: unknown
  theme: unknown
  font: unknown
  integrations: unknown
  seo: unknown
  published_at: string
}

interface PageProps {
  params: Promise<{ slug: string }>
}

async function fetchSite(slug: string): Promise<PublishedSiteRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('published_sites')
    .select('id, slug, business_name, template_id, sections, theme, font, integrations, seo, published_at')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as PublishedSiteRow
}

function toSiteData(row: PublishedSiteRow): SiteData {
  const seo = (row.seo as Record<string, string>) ?? {}
  const theme = (row.theme as Record<string, string>) ?? {}
  const font = (row.font as Record<string, string>) ?? {}
  const integrations = (row.integrations as SiteData['integrations']) ?? {}

  return {
    businessName: row.business_name,
    template_id: row.template_id ?? '',
    sections: Array.isArray(row.sections) ? (row.sections as SiteData['sections']) : [],
    theme: {
      primary: theme.primary ?? '#C8A96E',
      secondary: theme.secondary ?? '#6B7280',
      accent: theme.accent ?? '#F59E0B',
      bg: theme.bg ?? '#ffffff',
      text: theme.text ?? '#1a1a1a',
    },
    font: {
      heading: font.heading ?? 'Inter',
      body: font.body ?? 'Inter',
    },
    integrations: {
      paymentGateway: integrations.paymentGateway ?? '',
      whatsapp: integrations.whatsapp ?? { enabled: false, phone: '' },
      booking: integrations.booking ?? false,
      googleAnalytics: integrations.googleAnalytics ?? '',
      cookieConsent: integrations.cookieConsent ?? false,
      ecommerce: integrations.ecommerce ?? false,
    },
    seo: {
      title: seo.title ?? row.business_name,
      description: seo.description ?? '',
      keywords: seo.keywords ?? '',
    },
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const row = await fetchSite(slug)
  if (!row) {
    return { title: 'Site Not Found — LevitateOS' }
  }
  const seo = (row.seo as Record<string, string>) ?? {}
  const title = seo.title || row.business_name
  const description = seo.description || ''
  const keywords = seo.keywords || ''

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: `https://levitatelabs.online/sites/${slug}`,
      siteName: row.business_name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function SitePage({ params }: PageProps) {
  const { slug } = await params
  const row = await fetchSite(slug)

  if (!row) {
    notFound()
  }

  const siteData = toSiteData(row as PublishedSiteRow)
  const gaId = siteData.integrations.googleAnalytics

  return (
    <>
      {gaId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
            }}
          />
        </>
      )}
      <SiteRenderer data={siteData} />
    </>
  )
}
