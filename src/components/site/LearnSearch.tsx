'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import type { LearnEntry } from '@/content/learn/index'
import { openFeedback, track } from '@/lib/analytics'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** Instant search over every guide. Title matches rank first, then summary, then headings and keywords. */
export function LearnSearch({ index, cats }: { index: LearnEntry[]; cats: Record<string, string> }) {
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const router = useRouter()
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === '/' && !(e.target as HTMLElement)?.closest('input,textarea')) { e.preventDefault(); input.current?.focus() } }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])
  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 1)
    if (!words.length) return []
    return index.map(a => {
      const t = a.title.toLowerCase(), s = a.summary.toLowerCase()
      let score = 0
      for (const w of words) {
        const inT = t.includes(w), inS = s.includes(w), inX = a.terms.includes(w)
        if (!inT && !inS && !inX) return null
        score += inT ? 10 : inS ? 4 : 2
      }
      return { a, score }
    }).filter(Boolean).sort((x, y) => y!.score - x!.score).slice(0, 8).map(x => x!.a)
  }, [q, index])
  useEffect(() => { setAt(0) }, [q])
  useEffect(() => { if (!q) return; const t = setTimeout(() => track('learn.search', { q: q.slice(0, 40), n: hits.length }), 900); return () => clearTimeout(t) }, [q, hits.length])

  return (
    <div className="relative max-w-[640px] mx-auto text-left">
      <label htmlFor="learn-q" className="sr-only">Search the guides</label>
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-lp-faint pointer-events-none" />
        <input ref={input} id="learn-q" type="search" value={q} onChange={e => setQ(e.target.value)} autoComplete="off" role="combobox" aria-expanded={!!q} aria-controls="learn-hits"
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAt(i => Math.min(i + 1, hits.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setAt(i => Math.max(i - 1, 0)) }
            if (e.key === 'Enter' && hits[at]) router.push(`/learn/${hits[at].slug}`)
            if (e.key === 'Escape') setQ('')
          }}
          placeholder="Search: masks, bleed, PSD, halftone, shortcuts"
          className={`w-full h-14 pl-12 pr-12 rounded-2xl bg-[var(--lp-field)] border border-lp-line text-[16px] text-lp-text placeholder:text-lp-faint [box-shadow:var(--lp-shadow-sm)] focus:border-lp-faint focus:outline-none ${focus} [&::-webkit-search-cancel-button]:hidden`} />
        {q ? <button onClick={() => { setQ(''); input.current?.focus() }} aria-label="Clear search" className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-lp-dim hover:text-lp-fg ${focus}`}><X size={16} /></button>
          : <kbd className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 h-6 px-2 items-center rounded-md border border-lp-line text-[12px] text-lp-faint font-mono">/</kbd>}
      </div>
      {q && (
        <div id="learn-hits" role="listbox" className="absolute z-30 left-0 right-0 mt-2 rounded-2xl bg-lp-card border border-lp-line [box-shadow:var(--lp-shadow)] overflow-hidden">
          {hits.length ? hits.map((a, i) => (
            <Link key={a.slug} href={`/learn/${a.slug}`} role="option" aria-selected={i === at} onMouseEnter={() => setAt(i)} onClick={() => track('learn.search.pick', { slug: a.slug })}
              className={`block px-4 py-3 border-b border-lp-line last:border-0 ${i === at ? 'bg-lp-panel' : ''} ${focus}`}>
              <span className="flex items-center justify-between gap-3"><span className="text-[15px] font-medium text-lp-fg">{a.title}</span><span className="shrink-0 text-[12px] text-lp-faint">{cats[a.category]}</span></span>
              <span className="block mt-0.5 text-[13px] text-lp-dim line-clamp-1">{a.summary}</span>
            </Link>
          )) : (
            <p className="px-4 py-4 text-[14px] text-lp-dim">Nothing matches “{q}”. Try a simpler word, or <button onClick={() => openFeedback('learn-search')} className={`text-lp-accent hover:text-lp-fg rounded ${focus}`}>tell us what you were looking for</button>.</p>
          )}
        </div>
      )}
    </div>
  )
}
