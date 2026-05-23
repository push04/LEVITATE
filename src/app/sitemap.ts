import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://levitatelabs.online';

  // Static pages
  const staticPages = [
    '', '/demo', '/pricing', '/metrics', '/status', '/trial',
    '/48-hour-challenge', '/website-in-24-hours',
    '/for/clinics', '/for/coaching-centres', '/for/restaurants', '/for/real-estate',
    '/partners/agency', '/partners/ca-referral',
    '/tools/business-finder',
  ].map(path => ({ url: `${baseUrl}${path}`, lastModified: new Date() }));

  // Blog posts — only if Supabase is properly configured
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder');
    if (!isPlaceholder) {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: posts } = await supabase.from('blog_posts').select('slug, updated_at');
      blogPages = posts?.map(p => ({
        url: `${baseUrl}/blog/${p.slug}`,
        lastModified: new Date(p.updated_at),
      })) || [];
    }
  } catch {
    // Non-fatal: sitemap still returns static pages
  }

  const comparePages = ['vs-zoho-crm', 'vs-wati', 'vs-hubspot-india', 'vs-freshsales'].map(slug => ({
    url: `${baseUrl}/compare/${slug}`,
    lastModified: new Date(),
  }));

  return [...staticPages, ...blogPages, ...comparePages];
}
