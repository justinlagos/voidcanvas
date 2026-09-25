import { Landing, type LandingLearn } from '@/components/landing/Landing'
import { ARTICLES, CATEGORIES, PATHS, getArticle, inCategory } from '@/content/learn/index'
import { livePosts, fmtDate } from '@/content/blog/index'
import { minutes } from '@/content/util'
import { THEME_SCRIPT } from '@/components/site/theme-script'

// Rebuilt hourly so a new Friday post shows up in "From the blog" without a redeploy.
export const revalidate = 3600

export default function Home() {
  // Only titles and counts go to the client, never article bodies.
  const learn: LandingLearn = {
    total: ARTICLES.length,
    paths: PATHS.map(p => {
      const steps = p.slugs.map(getArticle).filter(Boolean).map(a => ({ slug: a!.slug, title: a!.title, min: minutes(a!.body) }))
      return { id: p.id, name: p.name, blurb: p.blurb, steps }
    }),
    cats: CATEGORIES.map(c => ({ id: c.id, name: c.name, count: inCategory(c.id).length })),
    posts: livePosts().slice(0, 3).map(p => ({ slug: p.slug, title: p.title, summary: p.summary, date: fmtDate(p.date), iso: p.date })),
  }
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <Landing learn={learn} />
    </>
  )
}
