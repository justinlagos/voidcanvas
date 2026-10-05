import type { MetadataRoute } from 'next'
import { ARTICLES, CATEGORIES, GOALS } from '@/content/learn/index'
import { livePosts } from '@/content/blog/index'
import { TOOLS } from '@/tools/defs'

const base = 'https://voidcanvas.app'
export const revalidate = 3600

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/editor', '/studio', '/effects']
  const toolRoutes = Object.values(TOOLS).map(t => `/tools/${t.slug}`)
  return [
    ...routes.map(r => ({ url: base + r, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...toolRoutes.map(r => ({ url: base + r, changeFrequency: 'weekly' as const, priority: 0.9 })),
    { url: `${base}/learn`, changeFrequency: 'weekly', priority: 0.9 },
    ...GOALS.map(g => ({ url: `${base}/learn/do/${g.id}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...CATEGORIES.map(c => ({ url: `${base}/learn/topic/${c.id}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    // Cornerstones carry a cluster each, so they rank above the supporting and reference pages.
    ...ARTICLES.map(a => ({ url: `${base}/learn/${a.slug}`, lastModified: a.updated, changeFrequency: 'monthly' as const, priority: a.role === 'cornerstone' ? 0.8 : a.role === 'reference' ? 0.5 : 0.6 })),
    { url: `${base}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    ...livePosts().map(p => ({ url: `${base}/blog/${p.slug}`, lastModified: p.date, changeFrequency: 'yearly' as const, priority: 0.5 })),
    { url: `${base}/download`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/report-a-bug`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/research`, changeFrequency: 'weekly', priority: 0.6 },
    ...['information', 'terms', 'privacy'].map(d => ({ url: `${base}/research/${d}`, changeFrequency: 'monthly' as const, priority: 0.3 })),
  ]
}
