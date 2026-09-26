import type { MetadataRoute } from 'next'
import { ARTICLES } from '@/content/learn/index'
import { livePosts } from '@/content/blog/index'

const base = 'https://voidcanvas.netlify.app'
export const revalidate = 3600

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/editor', '/studio', '/effects', '/tools/halftone', '/tools/dither', '/tools/glitch']
  return [
    ...routes.map(r => ({ url: base + r, changeFrequency: 'weekly' as const, priority: r.startsWith('/tools') ? 0.9 : 0.7 })),
    { url: `${base}/learn`, changeFrequency: 'weekly', priority: 0.8 },
    ...ARTICLES.map(a => ({ url: `${base}/learn/${a.slug}`, lastModified: a.updated, changeFrequency: 'monthly' as const, priority: 0.6 })),
    { url: `${base}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    ...livePosts().map(p => ({ url: `${base}/blog/${p.slug}`, lastModified: p.date, changeFrequency: 'yearly' as const, priority: 0.5 })),
    { url: `${base}/download`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/report-a-bug`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
