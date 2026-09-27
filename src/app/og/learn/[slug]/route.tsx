// Open Graph image for a guide, at /og/learn/<slug>. A route handler rather than opengraph-image.tsx so the desktop
// static export can prerender it (Next 14 cannot export dynamic metadata images).
import { ARTICLES, categoryOf, getArticle, minutes, answerOf } from '@/content/learn/index'
import { ogImage } from '@/components/site/og'

export const dynamic = 'force-static'
export function generateStaticParams() { return ARTICLES.map(a => ({ slug: a.slug })) }

export function GET(_req: Request, { params }: { params: { slug: string } }) {
  const a = getArticle(params.slug)
  if (!a) return ogImage({ eyebrow: 'Learn', title: 'Learn Voidcanvas' })
  return ogImage({ eyebrow: categoryOf(a.category).name, title: a.seoTitle ?? a.title, answer: answerOf(a.body) ?? a.summary, meta: `${a.level} · ${minutes(a.body)} min read` })
}
