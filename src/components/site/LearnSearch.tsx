'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Compass, Search, X } from 'lucide-react'
import type { GoalLite, LearnEntry } from '@/content/learn/index'
import { searchGoals, searchLearn } from '@/content/learn/search'
import { openFeedback, track } from '@/lib/analytics'
import { LevelTag } from './bits'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** Things people arrive with. Shown under the box; clicking one runs the search so the person sees how it answers. */
const EXAMPLES = ['how do I make a halftone portrait?', 'prepare a poster for print', 'edit a PSD without Photoshop', 'why does my print look blurry?', 'one design in every social size', 'photoshop masks']

/** Search over every guide and every goal. Understands problem phrasings through the concept map (see search.ts). */
export function LearnSearch({ index, goals, cats, big = true, placeholder }: { index: LearnEntry[]; goals: GoalLite[]; cats: Record<string, string>; big?: boolean; placeholder?: string }) {
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === '/' && !(e.target as HTMLElement)?.closest('input,textarea,[contenteditable]')) { e.preventDefault(); input.current?.focus() } }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])
  useEffect(() => {
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    addEventListener('pointerdown', out); return () => removeEventListener('pointerdown', out)
  }, [])

  const hits = useMemo(() => searchLearn(q, index, 7), [q, index])
  const routes = useMemo(() => searchGoals(q, goals, 1), [q, goals])
  const rows = useMemo(() => [...routes.map(g => ({ kind: 'goal' as const, href: `/learn/do/${g.id}`, g })), ...hits.map(h => ({ kind: 'guide' as const, href: `/learn/${h.slug}`, h }))], [routes, hits])
  useEffect(() => { setAt(0) }, [q])
  useEffect(() => { if (!q) return; const t = setTimeout(() => track('learn.search', { q: q.slice(0, 60), n: hits.length, goal: routes[0]?.id }), 900); return () => clearTimeout(t) }, [q, hits.length, routes])

  const go = (i: number) => { const r = rows[i]; if (!r) return; track('learn.search.pick', { q: q.slice(0, 60), href: r.href, i }); router.push(r.href) }
  const show = open && q.trim().length > 0

  return (
    <div ref={box} className={`relative ${big ? 'max-w-[760px]' : 'max-w-[560px]'} mx-auto text-left`}>
      <label htmlFor="learn-q" className="sr-only">Search design problems, techniques and guides</label>
      <div className="relative">
        <Search size={big ? 20 : 17} className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-lp-faint pointer-events-none" aria-hidden />
        <input ref={input} id="learn-q" type="search" value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} autoComplete="off" spellCheck={false}
          role="combobox" aria-expanded={show} aria-controls="learn-hits" aria-autocomplete="list" aria-activedescendant={show && rows[at] ? `hit-${at}` : undefined}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAt(i => Math.min(i + 1, rows.length - 1)); setOpen(true) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setAt(i => Math.max(i - 1, 0)) }
            if (e.key === 'Enter') { e.preventDefault(); go(at) }
            if (e.key === 'Escape') { if (q) setQ(''); else setOpen(false) }
          }}
          placeholder={placeholder ?? 'What are you trying to do? Try “blurry print”, “edit a PSD”, “halftone”…'}
          className={`w-full ${big ? 'h-[60px] sm:h-[68px] pl-12 sm:pl-14 pr-12 text-[17px] sm:text-[19px] rounded-[22px]' : 'h-12 pl-11 pr-11 text-[15px] rounded-2xl'} bg-[var(--lp-field)] border border-lp-line text-lp-text placeholder:text-lp-faint [box-shadow:var(--lp-shadow-sm)] focus:border-lp-faint focus:outline-none ${focus} [&::-webkit-search-cancel-button]:hidden`} />
        {q ? <button onClick={() => { setQ(''); input.current?.focus() }} aria-label="Clear search" className={`absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-lp-dim hover:text-lp-fg ${focus}`}><X size={17} /></button>
          : <kbd className="hidden sm:flex absolute right-5 top-1/2 -translate-y-1/2 h-6 px-2 items-center rounded-md border border-lp-line text-[12px] text-lp-faint font-mono">/</kbd>}
      </div>

      {big && !q && (
        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[13px] text-lp-dim">
          <span className="mr-1">Try:</span>
          {EXAMPLES.map(ex => <button key={ex} type="button" onClick={() => { setQ(ex); setOpen(true); input.current?.focus(); track('learn.search.example', { q: ex }) }} className={`h-7 px-2.5 rounded-full border border-lp-line text-lp-muted hover:text-lp-fg hover:border-lp-faint ${focus}`}>{ex}</button>)}
        </div>
      )}

      {show && (
        <div id="learn-hits" role="listbox" aria-label="Results" className="absolute z-30 left-0 right-0 mt-2 rounded-[22px] bg-lp-card border border-lp-line [box-shadow:var(--lp-shadow)] overflow-hidden max-h-[min(70vh,640px)] overflow-y-auto">
          {rows.length ? rows.map((r, i) => r.kind === 'goal' ? (
            <Link key={r.href} id={`hit-${i}`} href={r.href} role="option" aria-selected={i === at} onMouseEnter={() => setAt(i)} onClick={() => track('learn.search.pick', { q: q.slice(0, 60), href: r.href, i })}
              className={`flex items-start gap-3 px-4 sm:px-5 py-3.5 border-b border-lp-line ${i === at ? 'bg-lp-panel' : ''} ${focus}`}>
              <span className="mt-0.5 w-8 h-8 shrink-0 rounded-full bg-lp-panel border border-lp-line flex items-center justify-center text-lp-accent"><Compass size={15} /></span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-lp-accent">A route for this</span>
                <span className="block text-[15.5px] font-semibold text-lp-fg">{r.g.prompt}</span>
                <span className="block mt-0.5 text-[13px] text-lp-dim">{r.g.steps.length} guides in order · {r.g.blurb}</span>
              </span>
              <ArrowRight size={16} className="ml-auto mt-2 shrink-0 text-lp-faint" />
            </Link>
          ) : (
            <Link key={r.href} id={`hit-${i}`} href={r.href} role="option" aria-selected={i === at} onMouseEnter={() => setAt(i)} onClick={() => track('learn.search.pick', { q: q.slice(0, 60), href: r.href, i })}
              className={`block px-4 sm:px-5 py-3.5 border-b border-lp-line last:border-0 ${i === at ? 'bg-lp-panel' : ''} ${focus}`}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[15.5px] font-semibold text-lp-fg leading-snug">{r.h.title}</span>
                <span className="shrink-0 text-[12px] text-lp-faint">{cats[r.h.category]}</span>
              </span>
              <span className="mt-1 text-[13.5px] leading-snug text-lp-muted line-clamp-2">{r.h.answer ?? r.h.summary}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-lp-faint">
                <LevelTag level={r.h.level} /><span>{r.h.minutes} min</span>{r.h.feature && <span className="text-lp-dim">{r.h.feature}</span>}
                {r.h.why === 'concept' && <span className="italic">related</span>}
              </span>
            </Link>
          )) : (
            <div className="px-5 py-5 text-[14px] text-lp-dim">
              <p>Nothing matches “{q}” yet.</p>
              <p className="mt-1.5">Try a plainer word (“blurry”, “bleed”, “PSD”), pick a goal below, or <button onClick={() => openFeedback('learn-search:' + q.slice(0, 60))} className={`text-lp-accent hover:text-lp-fg rounded ${focus}`}>tell us what you were looking for</button> and it gets written.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
