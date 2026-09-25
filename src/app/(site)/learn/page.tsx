import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ARTICLES, CATEGORIES, PATHS, getArticle, inCategory, learnIndex, minutes } from '@/content/learn/index'
import { ArticleCard, CatIcon, Eyebrow, LevelTag, SITE, focus } from '@/components/site/bits'
import { LearnSearch } from '@/components/site/LearnSearch'

export const metadata: Metadata = {
  title: 'Learn Voidcanvas: guides, workflows and design craft',
  description: `${ARTICLES.length} guides to Voidcanvas and to design itself: the Editor, Studio and Effects, complete workflows, type, colour, print, and every shortcut.`,
  alternates: { canonical: `${SITE}/learn` },
  openGraph: { title: 'Learn Voidcanvas', description: 'Guides, workflows and design craft, from your first design to print-ready files.', url: `${SITE}/learn`, type: 'website' },
}

export default function LearnHub() {
  const index = learnIndex()
  const cats = Object.fromEntries(CATEGORIES.map(c => [c.id, c.name]))
  const totalMin = ARTICLES.reduce((n, a) => n + minutes(a.body), 0)
  return (
    <>
      {/* Hero with search */}
      <section className="relative">
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute left-1/2 top-[-30%] -translate-x-1/2 w-[900px] h-[520px] rounded-full bg-[radial-gradient(closest-side,var(--lp-glow),transparent)]" /></div>
        <div className="relative max-w-[1120px] mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-10 text-center">
          <Eyebrow>Learn</Eyebrow>
          <h1 className="mt-3 text-[40px] sm:text-[64px] leading-[1] font-semibold tracking-[-0.04em] text-lp-fg">Learn Voidcanvas.<br className="hidden sm:block" /> Learn design.</h1>
          <p className="mt-5 text-[17px] sm:text-[19px] leading-relaxed text-lp-muted max-w-[620px] mx-auto">{ARTICLES.length} guides, about {Math.round(totalMin / 60)} hours of reading. Every step is checked against the app, so what you read is what you will see.</p>
          <div className="mt-8"><LearnSearch index={index} cats={cats} /></div>
          <nav aria-label="Topics" className="mt-6 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map(c => (
              <a key={c.id} href={`#${c.id}`} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-lp-panel border border-lp-line text-[13px] text-lp-muted hover:text-lp-fg hover:border-lp-faint ${focus}`}><CatIcon id={c.id} size={14} className="text-lp-accent" />{c.name}</a>
            ))}
          </nav>
        </div>
      </section>

      {/* Learning paths */}
      <section aria-labelledby="paths" className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-8">
        <h2 id="paths" className="text-[26px] sm:text-[32px] font-semibold tracking-[-0.02em] text-lp-fg">Pick a path</h2>
        <p className="mt-1.5 text-[15.5px] text-lp-dim">Short courses, in order. Each one takes an afternoon or less.</p>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PATHS.map(p => {
            const steps = p.slugs.map(getArticle).filter(Boolean)
            const mins = steps.reduce((n, a) => n + minutes(a!.body), 0)
            return (
              <div key={p.id} className="rounded-[24px] bg-lp-card border border-lp-line p-5 flex flex-col">
                <h3 className="text-[18px] font-semibold tracking-tight text-lp-fg">{p.name}</h3>
                <p className="mt-1 text-[13.5px] text-lp-dim leading-relaxed">{p.blurb}</p>
                <ol className="mt-4 space-y-1 text-[13.5px]">
                  {steps.map((a, i) => (
                    <li key={a!.slug}><Link href={`/learn/${a!.slug}?path=${p.id}`} className={`flex gap-2.5 py-1 rounded text-lp-muted hover:text-lp-fg ${focus}`}><span className="w-5 shrink-0 text-lp-faint tabular-nums">{i + 1}</span><span>{a!.title}</span></Link></li>
                  ))}
                </ol>
                <div className="mt-auto pt-4 flex items-center justify-between text-[12.5px] text-lp-faint">
                  <span>{steps.length} guides · {mins} min</span>
                  <Link href={`/learn/${steps[0]!.slug}?path=${p.id}`} className={`inline-flex items-center gap-1 text-[13.5px] font-medium text-lp-accent hover:text-lp-fg rounded ${focus}`}>Start <ArrowRight size={14} /></Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Every guide, by topic */}
      {CATEGORIES.map(c => {
        const list = inCategory(c.id)
        return (
          <section key={c.id} id={c.id} aria-labelledby={`h-${c.id}`} className="scroll-mt-16 max-w-[1120px] mx-auto px-5 sm:px-8 pt-16 sm:pt-20">
            <div className="flex items-end justify-between gap-4 border-b border-lp-line pb-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 w-10 h-10 shrink-0 rounded-xl bg-lp-panel border border-lp-line flex items-center justify-center text-lp-accent"><CatIcon id={c.id} /></span>
                <div>
                  <h2 id={`h-${c.id}`} className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-lp-fg">{c.name}</h2>
                  <p className="text-[15px] text-lp-dim">{c.blurb}</p>
                </div>
              </div>
              <span className="hidden sm:block shrink-0 text-[13px] text-lp-faint">{list.length} guides</span>
            </div>
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map(a => <ArticleCard key={a.slug} href={`/learn/${a.slug}`} title={a.title} summary={a.summary} meta={<><LevelTag level={a.level} /><span>{minutes(a.body)} min read</span></>} />)}
            </div>
          </section>
        )
      })}

      {/* Can't find it */}
      <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20">
        <div className="rounded-[28px] bg-lp-card border border-lp-line px-6 sm:px-10 py-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-lp-fg">Something missing, or not working?</h2>
            <p className="mt-2 text-[15.5px] text-lp-dim max-w-[560px]">New guides are added as the app grows, and a new blog post goes out every Friday. If something is broken, a clear bug report gets it fixed fastest.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/report-a-bug" className={`inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[15px] font-medium hover:bg-lp-btn-hover ${focus}`}>Report a bug</Link>
            <Link href="/blog" className={`inline-flex items-center gap-2 h-11 px-4 rounded-full text-[15px] text-lp-accent hover:text-lp-fg ${focus}`}>Read the blog <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>
    </>
  )
}
