import type { MetadataRoute } from 'next'
const base = 'https://voidcanvas.netlify.app'
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/make', '/60', '/five', '/rescue', '/brief', '/one-image', '/psd', '/editor', '/studio', '/effects', '/tools/halftone', '/tools/dither', '/tools/glitch']
  return routes.map(r => ({ url: base + r, changeFrequency: 'weekly', priority: r.startsWith('/tools') ? 0.9 : 0.7 }))
}
