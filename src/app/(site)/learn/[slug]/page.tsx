import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'
import { ARTICLES, PATHS, categoryOf, getArticle, inCategory, minutes } from '@/content/learn/index'
import { Prose, outline } from '@/components/site/Prose'
import { ArticleCard, CatIcon, LevelTag, SITE, focus } from '@/components/site/bits'
import { Helpful, PathNav, Toc, type PathLite } from '@/components/site/ArticleExtras'
import { fmtDate } from '@/content/blog/index'

export const dynamicParams = false
export function generateStaticParams() { return ARTICLES.map(a => ({ slug: a.slug })) }

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const a = getArticle(params.slug)
  if (!a) return {}
  const url = `${SITE}/learn/${a.slug}`
  return {
    title: `${a.title} · Learn Voidcanvas`,
    description: a.summary,
    keywords: a.keywords,
    alternates: { canonical: url },
    openGraph: { title: a.title, description: a.summary, url, type: 'article', modifiedTime: a.updated },
  }
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug)
  if (!a) notFound()
  const cat = categoryOf(a.category)
  const siblings = inCategory(a.category)
  const i = siblings.findIndex(x => x.slug === a.slug)
  const prev = siblings[i - 1], next = siblings[i + 1]
  const related = (a.related ?? []).map(getArticle).filter(Boolean).slice(0, 3)
  const toc = outline(a.body)
  const paths: PathLite[] = PATHS.map(p => ({ id: p.id, name: p.name, steps: p.slugs.map(s => ({ slug: s, title: getArticle(s)?.title ?? s })) }))
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'TechArticle', headline: a.title, description: a.summary, dateModified: a.updated, proficiencyLevel: a.level, url: `${SITE}/learn/${a.slug}`, publisher: { '@type': 'Organization', name: 'MotionPlay Labs Ltd' }, about: 'Voidcanvas' },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Learn', item: `${SITE}/learn` },
        { '@type': 'ListItem', position: 2, name: cat.name, item: `${SITE}/learn#${cat.id}` },
        { '@type': 'ListItem', position: 3, name: a.title },
      ] },
    ],
  }

  return (
    <article className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-lp-dim">
        <Link href="/learn" className={`hover:text-lp-fg rounded ${focus}`}>Learn</Link><ChevronRight size={13} className="text-lp-faint" />
        <Link href={`/learn#${cat.id}`} className={`inline-flex items-center gap-1.5 hover:text-lp-fg rounded ${focus}`}><CatIcon id={cat.id} size={13} className="text-lp-accent" />{cat.name}</Link>
      </nav>

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_220px] gap-12">
        <div className="min-w-0 max-w-[720px]">
          <Suspense><PathNav slug={a.slug} paths={paths} where="top" /></Suspense>
          <header>
            <h1 className="text-[34px] sm:text-[46px] leading-[1.05] font-semibold tracking-[-0.03em] text-lp-fg">{a.title}</h1>
            <p className="mt-4 text-[18px] sm:text-[20px] leading-relaxed text-lp-muted">{a.summary}</p>
            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-lp-faint">
              <LevelTag level={a.level} /><span>{minutes(a.body)} min read</span><span>Updated {fmtDate(a.updated)}</span>
            </p>
          </header>
          {toc.length > 2 && (
            <details className="lg:hidden mt-6 rounded-2xl border border-lp-line bg-lp-card">
              <summary className={`cursor-pointer px-4 py-3 text-[14px] font-medium text-lp-fg rounded-2xl ${focus}`}>On this page</summary>
              <div className="px-4 pb-4"><Toc items={toc} /></div>
            </details>
          )}
          <div className="mt-8 sm:mt-10"><Prose body={a.body} /></div>
          <Suspense><PathNav slug={a.slug} paths={paths} where="bottom" /></Suspense>
          <Helpful slug={a.slug} />

          <nav aria-label="More in this topic" className="mt-8 grid sm:grid-cols-2 gap-3">
            {prev ? <Link href={`/learn/${prev.slug}`} className={`group rounded-2xl border border-lp-line p-4 hover:border-lp-faint ${focus}`}><span className="flex items-center gap-1 text-[12.5px] text-lp-faint"><ArrowLeft size={13} />Previous</span><span className="block mt-1 text-[15px] font-medium text-lp-fg group-hover:text-lp-accent">{prev.title}</span></Link> : <span />}
            {next && <Link href={`/learn/${next.slug}`} className={`group rounded-2xl border border-lp-line p-4 text-right hover:border-lp-faint ${focus}`}><span className="flex items-center justify-end gap-1 text-[12.5px] text-lp-faint">Next<ArrowRight size={13} /></span><span className="block mt-1 text-[15px] font-medium text-lp-fg group-hover:text-lp-accent">{next.title}</span></Link>}
          </nav>
        </div>

        {toc.length > 1 && (
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint">On this page</p>
              <Toc items={toc} />
              <Link href="/editor" className={`mt-8 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-lp-panel border border-lp-line text-[13px] text-lp-fg hover:border-lp-faint ${focus}`}>Open the Editor <ArrowRight size={13} /></Link>
            </div>
          </aside>
        )}
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-16 sm:mt-20">
          <h2 id="related" className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-lp-fg">Read next</h2>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map(r => <ArticleCard key={r!.slug} href={`/learn/${r!.slug}`} title={r!.title} summary={r!.summary} meta={<><LevelTag level={r!.level} /><span>{minutes(r!.body)} min read</span></>} />)}
          </div>
        </section>
      )}
    </article>
  )
}
