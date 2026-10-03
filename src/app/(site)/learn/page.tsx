import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookMarked, Briefcase, Layers, Sparkles } from 'lucide-react'
import { ARTICLES, CATEGORIES, GOALS, getArticle, goalIndex, inCategory, learnIndex, minutes, answerOf } from '@/content/learn/index'
import { CatIcon, Eyebrow, LevelTag, SITE, focus } from '@/components/site/bits'
import { LearnSearch } from '@/components/site/LearnSearch'
import { GoalPicker } from '@/components/site/GoalPicker'
import { serif, serifStyle } from '@/components/site/fonts'

export const metadata: Metadata = {
  title: 'Learn Voidcanvas: design problems, solved',
  description: `Arrive with a design problem, leave with the file. ${ARTICLES.length} guides that answer real questions about print, brand, photo editing, PSD files, effects and client work, then show the steps in Voidcanvas.`,
  alternates: { canonical: `${SITE}/learn` },
  openGraph: { title: 'Learn Voidcanvas: design problems, solved', description: 'Search a design problem, pick what you are trying to do, and get the answer, the guide and the tool.', url: `${SITE}/learn`, type: 'website', siteName: 'Voidcanvas', images: [{ url: `${SITE}/og/learn-hub`, width: 1200, height: 630, alt: 'Learn Voidcanvas' }] },
  twitter: { card: 'summary_large_image', title: 'Learn Voidcanvas: design problems, solved', description: 'Search a design problem, pick what you are trying to do, and get the answer, the guide and the tool.', images: [`${SITE}/og/learn-hub`] },
}

/** The problems people arrive with, phrased as they search for them. Each points at the guide that answers it. */
const PROBLEMS: { q: string; slug: string }[] = [
  { q: 'How do I prepare a poster for print?', slug: 'prepare-a-poster-for-print' },
  { q: 'How do I make a halftone portrait?', slug: 'make-a-halftone-portrait' },
  { q: 'How do I edit a PSD without Photoshop?', slug: 'edit-a-psd-without-photoshop' },
  { q: 'Why does my print look blurry?', slug: 'printed-design-looks-blurry' },
  { q: 'Why does my design look generic?', slug: 'make-your-design-look-less-generic' },
  { q: 'How do I remove a background without uploading the photo?', slug: 'remove-background' },
  { q: 'How do I get one design into every social size?', slug: 'resize-to-every-format' },
  { q: 'How do I keep a brand consistent?', slug: 'keep-a-brand-consistent' },
]

const TOOLS: { name: string; blurb: string; href: string; icon: typeof Layers; slugs: string[]; open: string }[] = [
  { name: 'Editor', blurb: 'A layered image editor: masks, type, adjustments, retouching, PSD in, print and screen out.', href: '/learn/topic/editor', icon: Layers, slugs: ['editor-tour', 'layers', 'masks', 'adjustment-layers', 'export-for-print'], open: '/editor' },
  { name: 'Studio', blurb: 'The job around the design: brief, references, directions, review rounds, delivery, brand guidelines.', href: '/learn/topic/studio', icon: Briefcase, slugs: ['studio-overview', 'start-a-job-from-a-brief', 'directions-and-review', 'brand-guidelines', 'delivering-files'], open: '/studio' },
  { name: 'Effects', blurb: '58 one-click effects with sliders, and the halftone, dither and glitch quick tools.', href: '/learn/topic/effects', icon: Sparkles, slugs: ['effects-overview', 'make-a-halftone-portrait', 'artistic-effects', 'quick-tools', 'filters-in-the-editor'], open: '/effects' },
]

export default function LearnHub() {
  const index = learnIndex()
  const goals = goalIndex()
  const cats = Object.fromEntries(CATEGORIES.map(c => [c.id, c.name]))
  const craft = inCategory('craft')
  const workflows = inCategory('workflows')
  const reference = inCategory('reference')
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: 'Learn Voidcanvas', url: `${SITE}/learn`, description: metadata.description, isPartOf: { '@type': 'WebSite', name: 'Voidcanvas', url: SITE }, publisher: { '@type': 'Organization', name: 'MotionPlay Labs Ltd' } },
      { '@type': 'ItemList', name: 'Design problems, solved', itemListElement: PROBLEMS.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.q, url: `${SITE}/learn/${p.slug}` })) },
    ],
  }

  return (
    <div className={serif.variable}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      {/* Hero: the question first, the search second, the goals third. */}
      <section className="relative">
        <div aria-hidden className="lp-hero-surface" />
        <div className="relative max-w-[1120px] mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-6 text-center">
          <Eyebrow>Learn</Eyebrow>
          <h1 className="mt-3 text-[42px] sm:text-[68px] lg:text-[80px] leading-[0.98] font-semibold tracking-[-0.04em] text-lp-fg">
            Arrive with a problem.<br />
            <span className="font-normal italic text-lp-muted" style={serifStyle}>Leave with the file.</span>
          </h1>
          <p className="mt-6 text-[17px] sm:text-[19px] leading-relaxed text-lp-muted max-w-[640px] mx-auto">{ARTICLES.length} guides that answer real design questions, then show the steps in Voidcanvas. Every step is checked against the app, so what you read is what you will see.</p>
          <div className="mt-8"><LearnSearch index={index} goals={goals} cats={cats} /></div>
        </div>
      </section>

      {/* What are you trying to do? */}
      <section aria-labelledby="goals" className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-10 sm:pt-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 id="goals" className="text-[26px] sm:text-[34px] font-semibold tracking-[-0.03em] text-lp-fg">What are you trying to do?</h2>
            <p className="mt-1.5 text-[15.5px] text-lp-dim">Pick one. You get the short answer, then the guides in the order that gets you there.</p>
          </div>
        </div>
        <div className="mt-6"><GoalPicker goals={goals} index={index} /></div>
      </section>

      {/* Start with a problem */}
      <section aria-labelledby="problems" className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-lp-accent">Start with a problem</p>
            <h2 id="problems" className="mt-2 text-[28px] sm:text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] text-lp-fg">The questions people arrive with.<br className="hidden sm:block" /> <span className="italic font-normal text-lp-muted" style={serifStyle}>Answered, then demonstrated.</span></h2>
          </div>
        </div>
        <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROBLEMS.map((p, i) => {
            const a = getArticle(p.slug)!
            const ans = answerOf(a.body) ?? a.summary
            return (
              <li key={p.slug}>
                <Link href={`/learn/${a.slug}`} className={`group flex flex-col h-full rounded-[24px] bg-lp-card border border-lp-line p-5 sm:p-6 hover:border-lp-faint hover:-translate-y-0.5 transition-[border-color,transform] duration-200 ${focus}`}>
                  <span className="text-[12px] tabular-nums text-lp-faint">{String(i + 1).padStart(2, '0')}</span>
                  <span className="mt-3 text-[19px] sm:text-[20px] leading-[1.25] font-semibold tracking-[-0.02em] text-lp-fg group-hover:text-lp-accent transition-colors">{p.q}</span>
                  <span className="mt-3 text-[13.5px] leading-relaxed text-lp-dim line-clamp-4">{ans}</span>
                  <span className="mt-auto pt-5 flex items-center justify-between text-[12.5px] text-lp-faint"><span className="flex items-center gap-3"><LevelTag level={a.level} /><span>{minutes(a.body)} min</span></span><ArrowRight size={15} className="text-lp-faint group-hover:text-lp-accent group-hover:translate-x-0.5 transition-all" /></span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Learn the tools */}
      <section aria-labelledby="tools" className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-lp-accent">Learn the tools</p>
        <h2 id="tools" className="mt-2 text-[28px] sm:text-[40px] leading-[1.05] font-semibold tracking-[-0.03em] text-lp-fg">Three tools. <span className="italic font-normal text-lp-muted" style={serifStyle}>Every setting explained.</span></h2>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {TOOLS.map(t => {
            const n = t.name === 'Editor' ? inCategory('editor').length : t.name === 'Studio' ? inCategory('studio').length : inCategory('effects').length
            return (
              <div key={t.name} className="rounded-[24px] bg-lp-card border border-lp-line p-6 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-lp-panel border border-lp-line flex items-center justify-center text-lp-accent"><t.icon size={18} aria-hidden /></span>
                  <span className="text-[12.5px] text-lp-faint">{n} guides</span>
                </div>
                <h3 className="mt-4 text-[22px] font-semibold tracking-tight text-lp-fg">{t.name}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-lp-dim">{t.blurb}</p>
                <ul className="mt-4 space-y-1.5 text-[14.5px]">
                  {t.slugs.map(getArticle).filter(Boolean).map(a => <li key={a!.slug}><Link href={`/learn/${a!.slug}`} className={`flex gap-2 text-lp-muted hover:text-lp-fg rounded ${focus}`}><span className="text-lp-faint">·</span>{a!.title}</Link></li>)}
                </ul>
                <div className="mt-auto pt-5 flex items-center justify-between">
                  <Link href={t.href} className={`inline-flex items-center gap-1 text-[14px] font-medium text-lp-accent hover:text-lp-fg rounded ${focus}`}>All {t.name} guides <ArrowRight size={14} /></Link>
                  <Link href={t.open} className={`text-[13px] text-lp-dim hover:text-lp-fg rounded ${focus}`}>Open {t.name}</Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Master the craft + Run real workflows */}
      <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28 grid lg:grid-cols-2 gap-10 lg:gap-8">
        <div aria-labelledby="craft">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-lp-accent">Master the craft</p>
          <h2 id="craft" className="mt-2 text-[28px] sm:text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-lp-fg">Design, taught properly.</h2>
          <p className="mt-2 text-[15px] text-lp-dim">Type, colour, layout, resolution, print and social, with the numbers, and where each setting lives.</p>
          <ol className="mt-6 divide-y divide-[var(--lp-line)] border-y border-lp-line">
            {craft.map(a => (
              <li key={a.slug}>
                <Link href={`/learn/${a.slug}`} className={`group flex items-baseline justify-between gap-4 py-3.5 ${focus}`}>
                  <span className="text-[16px] font-medium text-lp-fg group-hover:text-lp-accent leading-snug">{a.title}</span>
                  <span className="shrink-0 flex items-center gap-3 text-[12.5px] text-lp-faint"><LevelTag level={a.level} /><span>{minutes(a.body)} min</span></span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <div aria-labelledby="workflows">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-lp-accent">Run real workflows</p>
          <h2 id="workflows" className="mt-2 text-[28px] sm:text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] text-lp-fg">Whole jobs, start to finish.</h2>
          <p className="mt-2 text-[15px] text-lp-dim">Every step in the product, from a blank page or a photo to the delivered file.</p>
          <ol className="mt-6 grid sm:grid-cols-2 gap-3">
            {workflows.map((a, i) => (
              <li key={a.slug}>
                <Link href={`/learn/${a.slug}`} className={`group flex flex-col h-full rounded-2xl border border-lp-line bg-lp-card p-4 hover:border-lp-faint ${focus}`}>
                  <span className="text-[12px] tabular-nums text-lp-faint">{String(i + 1).padStart(2, '0')}</span>
                  <span className="mt-1.5 text-[15px] font-semibold leading-snug text-lp-fg group-hover:text-lp-accent">{a.title}</span>
                  <span className="mt-auto pt-3 text-[12.5px] text-lp-faint">{minutes(a.body)} min · {a.level}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Reference */}
      <section aria-labelledby="reference" className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28">
        <div className="rounded-[28px] border border-lp-line bg-lp-panel/50 p-6 sm:p-8 grid md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-start">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-lp-card border border-lp-line flex items-center justify-center text-lp-accent"><BookMarked size={18} aria-hidden /></span>
            <div><h2 id="reference" className="text-[20px] font-semibold tracking-tight text-lp-fg">Look it up</h2><p className="text-[13.5px] text-lp-dim">Reference pages, kept in step with the app.</p></div>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {reference.map(a => <li key={a.slug}><Link href={`/learn/${a.slug}`} className={`block rounded-2xl bg-lp-card border border-lp-line px-4 py-3 text-[14.5px] font-medium text-lp-fg hover:border-lp-faint hover:text-lp-accent ${focus}`}>{a.title}</Link></li>)}
          </ul>
        </div>
      </section>

      {/* Every guide, by topic: compact, complete, crawlable */}
      <section aria-labelledby="all" className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28">
        <h2 id="all" className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-lp-fg">Every guide, by topic</h2>
        <p className="mt-1.5 text-[14.5px] text-lp-dim">{ARTICLES.length} guides, about {Math.round(ARTICLES.reduce((n, a) => n + minutes(a.body), 0) / 60)} hours of reading. Each topic has its own page.</p>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">
          {CATEGORIES.map(c => (
            <div key={c.id} id={c.id} className="scroll-mt-16">
              <Link href={`/learn/topic/${c.id}`} className={`inline-flex items-center gap-2 text-[15px] font-semibold text-lp-fg hover:text-lp-accent rounded ${focus}`}><CatIcon id={c.id} size={15} className="text-lp-accent" />{c.name}<span className="text-[12px] font-normal text-lp-faint">{inCategory(c.id).length}</span></Link>
              <ul className="mt-2.5 space-y-1.5">
                {inCategory(c.id).map(a => <li key={a.slug}><Link href={`/learn/${a.slug}`} className={`block text-[13.5px] leading-snug text-lp-muted hover:text-lp-fg rounded ${focus}`}>{a.title}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Goals as links, for people and crawlers who skipped the picker */}
      <nav aria-label="Goals" className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-14">
        <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-lp-faint">Routes</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {GOALS.map(g => <li key={g.id}><Link href={`/learn/do/${g.id}`} className={`inline-flex items-center h-8 px-3 rounded-full border border-lp-line text-[13px] text-lp-muted hover:text-lp-fg hover:border-lp-faint ${focus}`}>{g.prompt}</Link></li>)}
        </ul>
      </nav>

      {/* Can't find it */}
      <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-16">
        <div className="rounded-[28px] bg-lp-card border border-lp-line px-6 sm:px-10 py-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-[-0.02em] text-lp-fg">Did not find your question?</h2>
            <p className="mt-2 text-[15.5px] text-lp-dim max-w-[560px]">Tell us what you searched for and it goes on the list to be written. If the app does not match a guide, a clear bug report gets it fixed fastest.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/report-a-bug" className={`inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[15px] font-medium hover:bg-lp-btn-hover ${focus}`}>Report a bug</Link>
            <Link href="/blog" className={`inline-flex items-center gap-2 h-11 px-4 rounded-full text-[15px] text-lp-accent hover:text-lp-fg ${focus}`}>Read the blog <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
