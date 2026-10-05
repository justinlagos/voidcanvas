import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ArrowRight, ChevronRight, Zap } from 'lucide-react'
import { ARTICLES, GOALS, PATHS, categoryOf, getArticle, minutes, answerOf } from '@/content/learn/index'
import { metaDescription, plain } from '@/content/util'
import { Prose, outline } from '@/components/site/Prose'
import { ArticleCard, CatIcon, LevelTag, SITE, focus } from '@/components/site/bits'
import { Helpful, PathNav, Toc, type PathLite } from '@/components/site/ArticleExtras'
import { fmtDate } from '@/content/blog/index'
import type { Article } from '@/content/types'
import { pageTitle } from '@/content/learn/seo'
import { toolForArticle } from '@/growth/contentGraph'

export const dynamicParams = false
export function generateStaticParams() { return ARTICLES.map(a => ({ slug: a.slug })) }

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const a = getArticle(params.slug)
  if (!a) return {}
  const url = `${SITE}/learn/${a.slug}`
  const description = metaDescription(a.description ?? a.summary)
  return {
    title: pageTitle(a),
    description,
    alternates: { canonical: url },
    openGraph: { title: a.seoTitle ?? a.title, description, url, type: 'article', siteName: 'Voidcanvas', modifiedTime: a.updated, publishedTime: a.published ?? a.updated, section: categoryOf(a.category).name, tags: a.goals, images: [{ url: `${SITE}/og/learn/${a.slug}`, width: 1200, height: 630, alt: a.title }] },
    twitter: { card: 'summary_large_image', title: a.seoTitle ?? a.title, description, images: [`${SITE}/og/learn/${a.slug}`] },
  }
}

/** The product a guide leans on, for the sidebar and the closing banner. */
function productFor(a: Article): { label: string; href: string } {
  const tool = toolForArticle(a)
  if (tool) return { label: tool.label, href: tool.href }
  if (a.category === 'studio' || (a.feature ?? '').startsWith('Studio')) return { label: 'Open Studio', href: '/studio' }
  if (a.category === 'effects' || (a.feature ?? '').startsWith('Effects')) return { label: 'Open Effects', href: '/effects' }
  return { label: 'Open the Editor', href: '/editor' }
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug)
  if (!a) notFound()
  const cat = categoryOf(a.category)
  const toc = outline(a.body)
  const answer = answerOf(a.body)
  const product = productFor(a)
  const hasProduct = a.body.some(b => b.t === 'product')
  const faq = a.body.find(b => b.t === 'faq')
  const goalsFor = GOALS.filter(g => g.steps.some(s => s.slug === a.slug))
  const paths: PathLite[] = [
    ...PATHS.map(p => ({ id: p.id, name: p.name, steps: p.slugs.map(s => ({ slug: s, title: getArticle(s)?.title ?? s })) })),
    ...GOALS.map(g => ({ id: g.id, name: g.prompt, steps: g.steps.map(s => ({ slug: s.slug, title: getArticle(s.slug)?.title ?? s.slug })), goal: true })),
  ]

  // Contextual links: the editor's voice, not a dump. Falls back to `related` when a guide has no signposts.
  const g = a.guide
  const before = (g?.before ?? []).map(getArticle).filter(Boolean) as Article[]
  const next = (g?.next ?? []).map(getArticle).filter(Boolean) as Article[]
  const also = (g?.also ?? []).map(x => ({ when: x.when, a: getArticle(x.slug) })).filter(x => x.a) as { when: string; a: Article }[]
  const used = new Set([a.slug, ...before, ...next, ...also.map(x => x.a)].map(x => typeof x === 'string' ? x : x.slug))
  const related = (a.related ?? []).map(getArticle).filter((r): r is Article => !!r && !used.has(r.slug)).slice(0, 3)

  const url = `${SITE}/learn/${a.slug}`
  const ld: Record<string, unknown>[] = [
    {
      '@type': 'TechArticle', '@id': `${url}#article`, headline: a.seoTitle ?? a.title, alternativeHeadline: a.seoTitle ? a.title : undefined, description: metaDescription(a.description ?? a.summary),
      datePublished: a.published ?? a.updated, dateModified: a.updated, proficiencyLevel: a.level, url, mainEntityOfPage: url, inLanguage: 'en-GB',
      image: `${SITE}/og/learn/${a.slug}`,
      author: { '@type': 'Organization', name: 'Voidcanvas', url: SITE }, publisher: { '@type': 'Organization', name: 'MotionPlay Labs Ltd', url: SITE },
      about: { '@type': 'SoftwareApplication', name: 'Voidcanvas', applicationCategory: 'DesignApplication', operatingSystem: 'Web', url: SITE },
      isPartOf: { '@type': 'CollectionPage', name: 'Learn Voidcanvas', url: `${SITE}/learn` },
      articleSection: cat.name, keywords: a.answers?.slice(0, 8).join(', '),
    },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Learn', item: `${SITE}/learn` },
      { '@type': 'ListItem', position: 2, name: cat.name, item: `${SITE}/learn/topic/${cat.id}` },
      { '@type': 'ListItem', position: 3, name: a.title },
    ] },
  ]
  if (faq && faq.t === 'faq') ld.push({ '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: faq.items.map(f => ({ '@type': 'Question', name: plain(f.q), acceptedAnswer: { '@type': 'Answer', text: plain(f.a) } })) })

  return (
    <article className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': ld }) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-lp-dim">
        <Link href="/learn" className={`hover:text-lp-fg rounded ${focus}`}>Learn</Link><ChevronRight size={13} className="text-lp-faint" />
        <Link href={`/learn/topic/${cat.id}`} className={`inline-flex items-center gap-1.5 hover:text-lp-fg rounded ${focus}`}><CatIcon id={cat.id} size={13} className="text-lp-accent" />{cat.name}</Link>
        {goalsFor[0] && <><ChevronRight size={13} className="text-lp-faint hidden sm:block" /><Link href={`/learn/do/${goalsFor[0].id}`} className={`hidden sm:inline hover:text-lp-fg rounded ${focus}`}>{goalsFor[0].name}</Link></>}
      </nav>

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_240px] gap-12">
        <div className="min-w-0 max-w-[720px]">
          <Suspense><PathNav slug={a.slug} paths={paths} where="top" /></Suspense>
          <header>
            <h1 className="text-[34px] sm:text-[46px] leading-[1.05] font-semibold tracking-[-0.03em] text-lp-fg">{a.title}</h1>
            <p className="mt-4 text-[18px] sm:text-[20px] leading-relaxed text-lp-muted">{a.summary}</p>
            <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-lp-faint">
              <LevelTag level={a.level} /><span>{minutes(a.body)} min read</span><span>Updated {fmtDate(a.updated)}</span>{a.feature && <span className="text-lp-dim">{a.feature}</span>}
            </p>
          </header>
          {toc.length > 2 && (
            <details className="lg:hidden mt-6 rounded-2xl border border-lp-line bg-lp-card">
              <summary className={`cursor-pointer px-4 py-3 text-[14px] font-medium text-lp-fg rounded-2xl ${focus}`}>On this page</summary>
              <div className="px-4 pb-4"><Toc items={toc} /></div>
            </details>
          )}
          <div className="mt-8 sm:mt-10"><Prose body={a.body} /></div>

          {!hasProduct && (
            <aside className="mt-12 rounded-[24px] border border-lp-line bg-[linear-gradient(135deg,var(--lp-panel),var(--lp-card))] px-5 sm:px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-lp-accent">Try it in Voidcanvas</p>
                <p className="mt-1.5 text-[15.5px] text-lp-text">{a.feature ? `${a.feature}. ` : ''}Free, in your browser, and your files stay on your device.</p>
              </div>
              <Link href={product.href} className={`shrink-0 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[15px] font-medium hover:bg-lp-btn-hover ${focus}`}>{product.label} <ArrowRight size={16} /></Link>
            </aside>
          )}

          <Suspense><PathNav slug={a.slug} paths={paths} where="bottom" /></Suspense>
          <Helpful slug={a.slug} />

          {(before.length > 0 || next.length > 0 || also.length > 0) && (
            <nav aria-label="Where to go from here" className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-6 text-[15px]">
              {before.length > 0 && (
                <div><p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-lp-faint">Before you start</p><ul className="mt-2 space-y-1.5">{before.map(b => <li key={b.slug}><Link href={`/learn/${b.slug}`} className={`text-lp-fg hover:text-lp-accent rounded ${focus}`}>{b.title}</Link><span className="block text-[13px] text-lp-dim">{b.level} · {minutes(b.body)} min</span></li>)}</ul></div>
              )}
              {next.length > 0 && (
                <div><p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-lp-faint">Next</p><ul className="mt-2 space-y-1.5">{next.map(b => <li key={b.slug}><Link href={`/learn/${b.slug}`} className={`text-lp-fg hover:text-lp-accent rounded ${focus}`}>{b.title}</Link><span className="block text-[13px] text-lp-dim">{b.level} · {minutes(b.body)} min</span></li>)}</ul></div>
              )}
              {also.length > 0 && (
                <div className="sm:col-span-2"><p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-lp-faint">If</p><ul className="mt-2 grid sm:grid-cols-2 gap-x-8 gap-y-1.5">{also.map(x => <li key={x.a.slug} className="text-lp-dim">{x.when[0].toUpperCase() + x.when.slice(1)}: <Link href={`/learn/${x.a.slug}`} className={`text-lp-fg hover:text-lp-accent rounded ${focus}`}>{x.a.title}</Link></li>)}</ul></div>
              )}
            </nav>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20">
            {answer && <a href="#quick-answer" className={`mb-5 flex items-center gap-1.5 text-[12.5px] font-medium text-lp-accent hover:text-lp-fg rounded ${focus}`}><Zap size={13} />Quick answer</a>}
            {toc.length > 1 && <><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint">On this page</p><Toc items={toc} /></>}
            <Link href={product.href} className={`mt-8 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-lp-panel border border-lp-line text-[13px] text-lp-fg hover:border-lp-faint ${focus}`}>{product.label} <ArrowRight size={13} /></Link>
            {goalsFor.length > 0 && (
              <div className="mt-8">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint">Part of</p>
                <ul className="space-y-1.5 text-[13px]">{goalsFor.map(g => <li key={g.id}><Link href={`/learn/do/${g.id}`} className={`text-lp-muted hover:text-lp-fg rounded ${focus}`}>{g.prompt}</Link></li>)}</ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-16 sm:mt-20">
          <h2 id="related" className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-lp-fg">Also useful</h2>
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map(r => <ArticleCard key={r.slug} href={`/learn/${r.slug}`} title={r.title} summary={answerOf(r.body) ?? r.summary} meta={<><LevelTag level={r.level} /><span>{minutes(r.body)} min read</span></>} />)}
          </div>
        </section>
      )}
    </article>
  )
}
