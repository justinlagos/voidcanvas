import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Rss } from 'lucide-react'
import { fmtDate, livePosts } from '@/content/blog/index'
import { minutes } from '@/content/util'
import { Eyebrow, SITE, focus } from '@/components/site/bits'

// Posts go live on their date without a redeploy: the list is rebuilt at most an hour after midnight.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Blog · Voidcanvas',
  description: 'A new post every Friday: how Voidcanvas works, why it works that way, and the design craft behind it.',
  alternates: { canonical: `${SITE}/blog`, types: { 'application/rss+xml': `${SITE}/blog/rss.xml` } },
  openGraph: { title: 'The Voidcanvas blog', description: 'A new post every Friday.', url: `${SITE}/blog`, type: 'website' },
}

export default function BlogIndex() {
  const posts = livePosts()
  const [lead, ...rest] = posts
  return (
    <div className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-14 sm:pt-20">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <Eyebrow>Blog</Eyebrow>
          <h1 className="mt-3 text-[40px] sm:text-[64px] leading-[1] font-semibold tracking-[-0.04em] text-lp-fg">Notes from the studio.</h1>
          <p className="mt-4 text-[17px] sm:text-[19px] text-lp-muted max-w-[560px]">A new post every Friday. How Voidcanvas works, why it works that way, and the design craft behind it.</p>
        </div>
        <a href="/blog/rss.xml" className={`self-start sm:self-auto inline-flex items-center gap-2 h-9 px-4 rounded-full bg-lp-panel border border-lp-line text-[13px] text-lp-muted hover:text-lp-fg ${focus}`}><Rss size={14} className="text-lp-accent" />RSS feed</a>
      </header>

      {lead && (
        <Link href={`/blog/${lead.slug}`} className={`group mt-12 block rounded-[28px] bg-lp-card border border-lp-line p-7 sm:p-10 hover:border-lp-faint transition-colors ${focus}`}>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-lp-faint"><span className="text-lp-accent font-medium">Latest</span><time dateTime={lead.date}>{fmtDate(lead.date)}</time><span>{minutes(lead.body)} min read</span>{lead.tags.map(t => <span key={t}>{t}</span>)}</p>
          <h2 className="mt-3 text-[28px] sm:text-[40px] leading-[1.08] font-semibold tracking-[-0.03em] text-lp-fg group-hover:text-lp-accent transition-colors max-w-[860px]">{lead.title}</h2>
          <p className="mt-4 text-[16.5px] sm:text-[18px] leading-relaxed text-lp-muted max-w-[720px]">{lead.summary}</p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium text-lp-accent">Read the post <ArrowRight size={16} /></span>
        </Link>
      )}

      {rest.length > 0 && (
        <ul className="mt-6 divide-y divide-[var(--lp-line)] border-y border-lp-line">
          {rest.map(p => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className={`group grid sm:grid-cols-[160px_1fr] gap-2 sm:gap-8 py-7 ${focus}`}>
                <time dateTime={p.date} className="text-[13.5px] text-lp-faint pt-1">{fmtDate(p.date)}</time>
                <span>
                  <span className="block text-[20px] sm:text-[24px] leading-snug font-semibold tracking-[-0.02em] text-lp-fg group-hover:text-lp-accent transition-colors">{p.title}</span>
                  <span className="block mt-2 text-[15.5px] leading-relaxed text-lp-dim max-w-[720px]">{p.summary}</span>
                  <span className="block mt-3 text-[12.5px] text-lp-faint">{minutes(p.body)} min read · {p.tags.join(', ')}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-[14.5px] text-lp-dim">Want the how-to rather than the why? Every feature has a step-by-step guide in <Link href="/learn" className="text-lp-accent hover:text-lp-fg">Learn</Link>.</p>
    </div>
  )
}
