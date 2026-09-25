import { livePosts } from '@/content/blog/index'
import { plain } from '@/content/util'

export const revalidate = 3600
const SITE = 'https://voidcanvas.netlify.app'
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function GET() {
  const items = livePosts().map(p => `
    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.date + 'T08:00:00Z').toUTCString()}</pubDate>
      <author>${esc(p.author)}</author>
      ${p.tags.map(t => `<category>${esc(t)}</category>`).join('')}
      <description>${esc(plain(p.summary))}</description>
    </item>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Voidcanvas blog</title>
    <link>${SITE}/blog</link>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>A new post every Friday from the makers of Voidcanvas.</description>
    <language>en-gb</language>${items}
  </channel>
</rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
}
