import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ChevronRight, Zap } from 'lucide-react'
import { GOALS, getArticle, getGoal, goalIndex, learnIndex, minutes, answerOf, CATEGORIES } from '@/content/learn/index'
import { metaDescription } from '@/content/util'
import { Eyebrow, LevelTag, SITE, focus } from '@/components/site/bits'
import { LearnSearch } from '@/components/site/LearnSearch'
import { serif, serifStyle } from '@/components/site/fonts'

export const dynamicParams = false
export function generateStaticParams() { return GOALS.map(g => ({ goal: g.id })) }

export function generateMetadata({ params }: { params: { goal: string } }): Metadata {
  const g = getGoal(params.goal)
  if (!g) return {}
  const url = `${SITE}/learn/do/${g.id}`
  const title = `${g.prompt}: the route through Voidcanvas Learn`
  const description = metaDescription(g.answer)
  return {
    title: title.length > 60 ? `${g.prompt} · Voidcanvas Learn` : title, description,
    alternates: { canonical: url },
    openGraph: { title: g.prompt, description, url, type: 'website', siteName: 'Voidcanvas', images: [{ url: `${SITE}/og/learn/do/${g.id}`, width: 1200, height: 630, alt: g.prompt }] },
    twitter: { card: 'summary_large_image', title: g.prompt, description, images: [`${SITE}/og/learn/do/${g.id}`] },
  }
}

export default function GoalPage({ params }: { params: { goal: string } }) {
  const g = getGoal(params.goal)
  if (!g) notFound()
  const steps = g.steps.map(s => ({ ...s, a: getArticle(s.slug)! })).filter(s => s.a)
  const total = steps.reduce((n, s) => n + minutes(s.a.body), 0)
  const others = GOALS.filter(x => x.id !== g.id).slice(0, 6)
  const cats = Object.fromEntries(CATEGORIES.map(c => [c.id, c.name]))
  const url = `${SITE}/learn/do/${g.id}`
  const ld: Record<string, unknown>[] = [
    { '@type': 'CollectionPage', '@id': url, name: g.prompt, description: g.answer, url, isPartOf: { '@type': 'CollectionPage', name: 'Learn Voidcanvas', url: `${SITE}/learn` }, publisher: { '@type': 'Organization', name: 'MotionPlay Labs Ltd' } },
    { '@type': 'ItemList', name: `${g.prompt}: guides in order`, itemListOrder: 'https://schema.org/ItemListOrderAscending', numberOfItems: steps.length, itemListElement: steps.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.a.title, url: `${SITE}/learn/${s.a.slug}`, description: s.why })) },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Learn', item: `${SITE}/learn` }, { '@type': 'ListItem', position: 2, name: g.name }] },
  ]
  if (g.faq?.length) ld.push({ '@type': 'FAQPage', mainEntity: g.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })

  return (
    <div className={`max-w-[1120px] mx-auto px-5 sm:px-8 pt-8 sm:pt-12 ${serif.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': ld }) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-lp-dim">
        <Link href="/learn" className={`hover:text-lp-fg rounded ${focus}`}>Learn</Link><ChevronRight size={13} className="text-lp-faint" /><span className="text-lp-fg">{g.name}</span>
      </nav>

      <header className="mt-6 max-w-[820px]">
        <Eyebrow>A route</Eyebrow>
        <h1 className="mt-3 text-[36px] sm:text-[56px] leading-[1.02] font-semibold tracking-[-0.035em] text-lp-fg">{g.prompt}<span className="text-lp-faint">.</span></h1>
        <p className="mt-4 text-[17px] sm:text-[19px] text-lp-muted">{g.blurb} {steps.length} guides, about {total} minutes in total, in the order that gets you there.</p>
      </header>

      <div className="mt-10 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-10 lg:gap-14 items-start">
        <div className="min-w-0">
          <aside id="quick-answer" className="rounded-[24px] border border-lp-line bg-lp-card px-6 sm:px-8 py-6 [box-shadow:var(--lp-shadow-sm)]">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-lp-accent"><Zap size={13} aria-hidden />The short answer</p>
            <p className="mt-2.5 text-[18px] sm:text-[20px] leading-[1.55] text-lp-fg">{g.answer}</p>
          </aside>

          <h2 className="mt-12 text-[13px] font-semibold uppercase tracking-[0.1em] text-lp-faint">The route, in order</h2>
          <ol className="mt-4">
            {steps.map((s, i) => {
              const ans = answerOf(s.a.body)
              return (
                <li key={s.slug} className="relative pl-12 sm:pl-14 pb-8 last:pb-0">
                  <span aria-hidden className="absolute left-[15px] sm:left-[19px] top-9 bottom-0 w-px bg-lp-line last:hidden" />
                  <span aria-hidden className="absolute left-0 top-0.5 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-lp-panel border border-lp-line flex items-center justify-center text-[13px] sm:text-[14px] font-semibold tabular-nums text-lp-fg">{i + 1}</span>
                  <Link href={`/learn/${s.a.slug}?goal=${g.id}`} className={`group block rounded-[22px] border border-lp-line bg-lp-card p-5 sm:p-6 hover:border-lp-faint transition-colors ${focus}`}>
                    <span className="block text-[12.5px] text-lp-accent">{s.why}</span>
                    <span className="mt-1.5 block text-[20px] sm:text-[22px] leading-snug font-semibold tracking-[-0.02em] text-lp-fg group-hover:text-lp-accent transition-colors">{s.a.title}</span>
                    <span className="mt-2 text-[14.5px] leading-relaxed text-lp-dim line-clamp-3">{ans ?? s.a.summary}</span>
                    <span className="mt-3 flex items-center gap-3 text-[12.5px] text-lp-faint"><LevelTag level={s.a.level} /><span>{minutes(s.a.body)} min</span><span>{cats[s.a.category]}</span>{s.a.feature && <span className="hidden sm:inline text-lp-dim">{s.a.feature}</span>}</span>
                  </Link>
                </li>
              )
            })}
          </ol>

          <aside className="mt-12 rounded-[24px] border border-lp-line bg-[linear-gradient(135deg,var(--lp-panel),var(--lp-card))] px-6 sm:px-8 py-7">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-lp-accent">How Voidcanvas handles this</p>
            <p className="mt-2 text-[16px] leading-relaxed text-lp-text">{g.product.text}</p>
            <Link href={g.product.href} className={`mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[15px] font-medium hover:bg-lp-btn-hover ${focus}`}>{g.product.label} <ArrowRight size={16} /></Link>
          </aside>

          {g.faq && g.faq.length > 0 && (
            <section className="mt-12">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-lp-fg">Questions people ask</h2>
              <div className="mt-4 divide-y divide-[var(--lp-line)] border-y border-lp-line">
                {g.faq.map(f => <details key={f.q} className="group py-1"><summary className={`cursor-pointer list-none py-3 pr-8 relative text-[16.5px] font-medium text-lp-fg rounded-lg ${focus}`}><h3 className="inline">{f.q}</h3><span aria-hidden className="absolute right-1 top-1/2 -translate-y-1/2 text-lp-faint transition-transform group-open:rotate-45 text-[20px] leading-none">+</span></summary><p className="pb-4 text-[15.5px] leading-relaxed text-lp-muted">{f.a}</p></details>)}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-20 space-y-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint">Search instead</p>
            <div className="mt-3"><LearnSearch index={learnIndex()} goals={goalIndex()} cats={cats} big={false} placeholder="Search the guides" /></div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-faint">Other routes</p>
            <ul className="mt-3 space-y-2">
              {others.map(o => <li key={o.id}><Link href={`/learn/do/${o.id}`} className={`block text-[14.5px] text-lp-muted hover:text-lp-fg rounded ${focus}`}>{o.prompt}</Link></li>)}
              <li><Link href="/learn#goals" className={`inline-flex items-center gap-1 text-[14px] text-lp-accent hover:text-lp-fg rounded ${focus}`}>All routes <ArrowRight size={13} /></Link></li>
            </ul>
          </div>
          <p className="text-[13px] leading-relaxed text-lp-faint" style={serifStyle}><span className="italic text-[15px]">Every step is checked against the app.</span></p>
        </aside>
      </div>
    </div>
  )
}
