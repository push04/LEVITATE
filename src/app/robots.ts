import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/api'] },
      { userAgent: 'Googlebot', allow: '/', disallow: ['/dashboard', '/admin'] },
    ],
    sitemap: 'https://levitatelabs.online/sitemap.xml',
  };
}
