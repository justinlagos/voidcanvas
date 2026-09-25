'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, ThumbsDown, ThumbsUp } from 'lucide-react'
import { openBugReport, openFeedback, track } from '@/lib/analytics'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export type PathLite = { id: string; name: string; steps: { slug: string; title: string }[] }

/** When you arrive from a learning path (?path=id), shows where you are in it and the next step. */
export function PathNav({ slug, paths, where }: { slug: string; paths: PathLite[]; where: 'top' | 'bottom' }) {
  const q = useSearchParams()
  const p = paths.find(x => x.id === q.get('path') && x.steps.some(s => s.slug === slug))
  if (!p) return null
  const i = p.steps.findIndex(s => s.slug === slug)
  const next = p.steps[i + 1]
  if (where === 'top') return (
    <div className="mb-6 rounded-2xl border border-lp-line bg-lp-panel/60 px-4 py-3 text-[13.5px]">
      <p className="text-lp-dim"><span className="text-lp-fg font-medium">{p.name}</span> · step {i + 1} of {p.steps.length}</p>
      <div className="mt-2 flex gap-1" aria-hidden>{p.steps.map((s, j) => <span key={s.slug} className={`h-1 flex-1 rounded-full ${j <= i ? 'bg-accent' : 'bg-lp-line'}`} />)}</div>
    </div>
  )
  return next ? (
    <Link href={`/learn/${next.slug}?path=${p.id}`} className={`mt-10 flex items-center justify-between gap-4 rounded-2xl bg-lp-btn text-lp-btn-fg px-5 py-4 hover:bg-lp-btn-hover ${focus}`}>
      <span><span className="block text-[12.5px] opacity-70">Next in {p.name}</span><span className="block text-[16px] font-semibold">{next.title}</span></span><ArrowRight size={20} />
    </Link>
  ) : (
    <div className="mt-10 rounded-2xl border border-lp-line bg-lp-card px-5 py-4 text-[15px] text-lp-text">You have finished <strong className="text-lp-fg">{p.name}</strong>. <Link href="/learn" className="text-lp-accent">Pick another path</Link>.</div>
  )
}

/** "Was this useful?" One tap; a no opens the feedback box so the gap can be fixed. */
export function Helpful({ slug }: { slug: string }) {
  const [v, setV] = useState<null | boolean>(null)
  useEffect(() => { setV(null) }, [slug])
  const vote = (yes: boolean) => { setV(yes); track('learn.helpful', { slug, yes }); if (!yes) openFeedback('learn:' + slug) }
  return (
    <div className="mt-12 pt-6 border-t border-lp-line flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[14px]">
      {v === null ? (
        <div className="flex items-center gap-3">
          <span className="text-lp-text">Was this guide useful?</span>
          <button onClick={() => vote(true)} className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-lp-line text-lp-muted hover:text-lp-fg hover:border-lp-faint ${focus}`}><ThumbsUp size={14} />Yes</button>
          <button onClick={() => vote(false)} className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-lp-line text-lp-muted hover:text-lp-fg hover:border-lp-faint ${focus}`}><ThumbsDown size={14} />No</button>
        </div>
      ) : <p role="status" className="text-lp-text">{v ? 'Thanks. Good to know it helped.' : 'Thanks. Tell us what was missing in the box that opened.'}</p>}
      <button onClick={() => openBugReport('learn')} className={`self-start sm:self-auto text-lp-dim hover:text-lp-fg rounded ${focus}`}>Does the app not match this page? Report a bug</button>
    </div>
  )
}

/** Highlights the section you are reading in "On this page". */
export function Toc({ items }: { items: { id: string; text: string }[] }) {
  const [here, setHere] = useState('')
  useEffect(() => {
    const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) setHere(e.target.id) }, { rootMargin: '-20% 0px -70% 0px' })
    items.forEach(i => { const el = document.getElementById(i.id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [items])
  return (
    <ul className="space-y-0.5 text-[13px] border-l border-lp-line">
      {items.map(i => (
        <li key={i.id}><a href={`#${i.id}`} aria-current={here === i.id ? 'true' : undefined} className={`block -ml-px pl-3 py-1 border-l-2 leading-snug transition-colors ${here === i.id ? 'border-accent text-lp-fg' : 'border-transparent text-lp-dim hover:text-lp-fg'} ${focus}`}>{i.text.replace(/\*\*|`/g, '')}</a></li>
      ))}
    </ul>
  )
}
