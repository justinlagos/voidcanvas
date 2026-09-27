import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { CATEGORIES, GOALS, categoryOf, inCategory, minutes, answerOf } from '@/content/learn/index'
import type { LearnCategory } from '@/content/types'
import { ArticleCard, CatIcon, Eyebrow, LevelTag, SITE, focus } from '@/components/site/bits'

export const dynamicParams = false
export function generateStaticParams() { return CATEGORIES.map(c => ({ category: c.id })) }

const OPEN: Partial<Record<LearnCategory, { label: string; href: string }>> = {
  editor: { label: 'Open the Editor', href: '/editor' }, studio: { label: 'Open Studio', href: '/studio' }, effects: { label: 'Open Effects', href: '/effects' },
}

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const c = CATEGORIES.find(x => x.id === params.category)
  if (!c) return {}
  const url = `${SITE}/learn/topic/${c.id}`
  const n = inCategory(c.id).length
  const title = `${c.name}: ${n} guides · Voidcanvas Learn`
  return { title, description: c.blurb, alternates: { canonical: url }, openGraph: { title: `${c.name} guides`, description: c.blurb, url, type: 'website', siteName: 'Voidcanvas', images: [{ url: `${SITE}/og/learn-hub`, width: 1200, height: 630, alt: 'Learn Voidcanvas' }] }, twitter: { card: 'summary_large_image', title: `${c.name} guides`, description: c.blurb, images: [`${SITE}/og/learn-hub`] } }
}

export default function TopicPage({ params }: { params: { category: string } }) {
  const c = CATEGORIES.find(x => x.id === params.category)
  if (!c) notFound()
  const cat = categoryOf(c.id)
  const list = inCategory(c.id)
  const corner = list.filter(a => a.role === 'cornerstone')
  const rest = list.filter(a => a.role !== 'cornerstone')
  const goals = GOALS.filter(g => g.steps.some(s => list.some(a => a.slug === s.slug))).slice(0, 6)
  const open = OPEN[c.id]
  const url = `${SITE}/learn/topic/${c.id}`
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: `${cat.name} guides`, description: cat.blurb, url, isPartOf: { '@type': 'CollectionPage', name: 'Learn Voidcanvas', url: `${SITE}/learn` } },
    { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.title, url: `${SITE}/learn/${a.slug}` })) },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Learn', item: `${SITE}/learn` }, { '@type': 'ListItem', position: 2, name: cat.name }] },
  ] }

  return (
    <div className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-lp-dim">
        <Link href="/learn" className={`hover:text-lp-fg rounded ${focus}`}>Learn</Link><ChevronRight size={13} className="text-lp-faint" /><span className="text-lp-fg">{cat.name}</span>
      </nav>
      <header className="mt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div className="max-w-[720px]">
          <Eyebrow>Topic</Eyebrow>
          <h1 className="mt-3 flex items-center gap-3 text-[36px] sm:text-[52px] leading-[1.02] font-semibold tracking-[-0.035em] text-lp-fg"><span className="w-12 h-12 shrink-0 rounded-2xl bg-lp-panel border border-lp-line flex items-center justify-center text-lp-accent"><CatIcon id={cat.id} size={22} /></span>{cat.name}</h1>
          <p className="mt-4 text-[17px] sm:text-[19px] text-lp-muted">{cat.blurb} {list.length} guides.</p>
        </div>
        {open && <Link href={open.href} className={`self-start sm:self-auto inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[15px] font-medium hover:bg-lp-btn-hover ${focus}`}>{open.label}</Link>}
      </header>

      {corner.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-lp-faint">Start with these</h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {corner.map(a => <ArticleCard key={a.slug} href={`/learn/${a.slug}`} title={a.title} summary={answerOf(a.body) ?? a.summary} meta={<><LevelTag level={a.level} /><span>{minutes(a.body)} min read</span></>} />)}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-lp-faint">{corner.length ? 'Everything else in this topic' : 'Guides'}</h2>
        <ul className="mt-4 divide-y divide-[var(--lp-line)] border-y border-lp-line">
          {rest.map(a => (
            <li key={a.slug}>
              <Link href={`/learn/${a.slug}`} className={`group grid sm:grid-cols-[minmax(0,1fr)_200px] gap-2 sm:gap-8 py-4 ${focus}`}>
                <span>
                  <span className="block text-[17px] font-semibold leading-snug text-lp-fg group-hover:text-lp-accent">{a.title}</span>
                  <span className="block mt-1 text-[14px] leading-relaxed text-lp-dim">{a.summary}</span>
                </span>
                <span className="flex sm:flex-col sm:items-end gap-3 sm:gap-1 text-[12.5px] text-lp-faint pt-1"><LevelTag level={a.level} /><span>{minutes(a.body)} min</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {goals.length > 0 && (
        <nav aria-label="Routes through this topic" className="mt-14">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-lp-faint">Routes that use this topic</p>
          <ul className="mt-3 flex flex-wrap gap-2">{goals.map(g => <li key={g.id}><Link href={`/learn/do/${g.id}`} className={`inline-flex items-center h-9 px-3.5 rounded-full border border-lp-line text-[13.5px] text-lp-muted hover:text-lp-fg hover:border-lp-faint ${focus}`}>{g.prompt}</Link></li>)}</ul>
        </nav>
      )}
    </div>
  )
}
