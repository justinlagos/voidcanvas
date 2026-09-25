import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { fmtDate, getPost, isLive, livePosts } from '@/content/blog/index'
import { minutes } from '@/content/util'
import { Prose } from '@/components/site/Prose'
import { SITE, focus } from '@/components/site/bits'

// Queued posts are built on their day: unknown slugs are rendered on demand and cached for an hour.
export const revalidate = 3600
export function generateStaticParams() { return livePosts().map(p => ({ slug: p.slug })) }

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getPost(params.slug)
  if (!p || !isLive(p)) return {}
  const url = `${SITE}/blog/${p.slug}`
  return {
    title: `${p.title} · Voidcanvas blog`,
    description: p.summary,
    alternates: { canonical: url },
    authors: [{ name: p.author }],
    openGraph: { title: p.title, description: p.summary, url, type: 'article', publishedTime: p.date, authors: [p.author], tags: p.tags },
  }
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const p = getPost(params.slug)
  if (!p || !isLive(p)) notFound()
  const live = livePosts()
  const i = live.findIndex(x => x.slug === p.slug)
  const newer = live[i - 1], older = live[i + 1]
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.summary, datePublished: p.date, author: { '@type': 'Person', name: p.author }, publisher: { '@type': 'Organization', name: 'MotionPlay Labs Ltd' }, url: `${SITE}/blog/${p.slug}`, keywords: p.tags.join(', ') }

  return (
    <article className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-8 sm:pt-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="max-w-[720px] mx-auto">
        <Link href="/blog" className={`inline-flex items-center gap-1.5 text-[13px] text-lp-dim hover:text-lp-fg rounded ${focus}`}><ArrowLeft size={13} />All posts</Link>
        <header className="mt-8">
          <p className="flex flex-wrap gap-2">{p.tags.map(t => <span key={t} className="h-6 px-2.5 inline-flex items-center rounded-full bg-lp-panel border border-lp-line text-[12px] text-lp-muted">{t}</span>)}</p>
          <h1 className="mt-4 text-[34px] sm:text-[50px] leading-[1.04] font-semibold tracking-[-0.035em] text-lp-fg">{p.title}</h1>
          <p className="mt-5 text-[18px] sm:text-[21px] leading-relaxed text-lp-muted">{p.summary}</p>
          <div className="mt-6 flex items-center gap-3 text-[13.5px]">
            <span aria-hidden className="w-9 h-9 rounded-full bg-lp-btn text-lp-btn-fg flex items-center justify-center text-[13px] font-semibold">{p.author.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
            <span><span className="block text-lp-fg font-medium">{p.author}</span><span className="block text-lp-faint"><time dateTime={p.date}>{fmtDate(p.date)}</time> · {minutes(p.body)} min read</span></span>
          </div>
        </header>
        <div className="mt-10 pt-10 border-t border-lp-line"><Prose body={p.body} /></div>

        <nav aria-label="More posts" className="mt-16 grid sm:grid-cols-2 gap-3">
          {older ? <Link href={`/blog/${older.slug}`} className={`group rounded-2xl border border-lp-line p-4 hover:border-lp-faint ${focus}`}><span className="flex items-center gap-1 text-[12.5px] text-lp-faint"><ArrowLeft size={13} />Earlier</span><span className="block mt-1 text-[15px] font-medium text-lp-fg group-hover:text-lp-accent">{older.title}</span></Link> : <span />}
          {newer && <Link href={`/blog/${newer.slug}`} className={`group rounded-2xl border border-lp-line p-4 text-right hover:border-lp-faint ${focus}`}><span className="flex items-center justify-end gap-1 text-[12.5px] text-lp-faint">Newer<ArrowRight size={13} /></span><span className="block mt-1 text-[15px] font-medium text-lp-fg group-hover:text-lp-accent">{newer.title}</span></Link>}
        </nav>
        <p className="mt-8 text-[14px] text-lp-dim">A new post goes out every Friday. Follow along with the <a href="/blog/rss.xml" className="text-lp-accent hover:text-lp-fg">RSS feed</a>, or learn the app step by step in <Link href="/learn" className="text-lp-accent hover:text-lp-fg">Learn</Link>.</p>
      </div>
    </article>
  )
}
