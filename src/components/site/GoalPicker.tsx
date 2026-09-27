'use client'

// "What are you trying to do?" Pick a goal and the guides for it appear in order, with the reason each one is there.
// The chips are real links to the goal pages, so the routing works without JavaScript and search engines can follow it.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import type { GoalLite, LearnEntry } from '@/content/learn/index'
import { track } from '@/lib/analytics'
import { LevelTag } from './bits'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function GoalPicker({ goals, index, initial }: { goals: GoalLite[]; index: LearnEntry[]; initial?: string }) {
  const [id, setId] = useState<string | null>(initial ?? null)
  const [more, setMore] = useState(false)
  const bySlug = new Map(index.map(a => [a.slug, a]))
  const goal = goals.find(g => g.id === id) ?? null
  const shown = more ? goals : goals.filter(g => g.primary)
  const panel = useRef<HTMLDivElement>(null)
  // Bring the route into view when it opens below the fold, without yanking the page when it is already visible.
  useEffect(() => {
    const el = panel.current
    if (!el || !id) return
    const r = el.getBoundingClientRect()
    if (r.top > innerHeight * 0.7 || r.top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [id])
  const pick = (g: GoalLite) => (e: React.MouseEvent) => { e.preventDefault(); setId(g.id === id ? null : g.id); track('learn.goal', { id: g.id }) }

  return (
    <div>
      <div role="group" aria-label="Goals" className="flex flex-wrap gap-2">
        {shown.map(g => (
          <a key={g.id} href={`/learn/do/${g.id}`} onClick={pick(g)} aria-pressed={g.id === id}
            className={`inline-flex items-center h-10 px-4 rounded-full border text-[14.5px] font-medium transition-colors ${g.id === id ? 'bg-lp-btn text-lp-btn-fg border-transparent' : 'bg-lp-card border-lp-line text-lp-text hover:border-lp-faint hover:text-lp-fg'} ${focus}`}>{g.name}</a>
        ))}
        {!more && goals.length > shown.length && (
          <button type="button" onClick={() => setMore(true)} className={`inline-flex items-center gap-1 h-10 px-4 rounded-full border border-dashed border-lp-line text-[14.5px] text-lp-dim hover:text-lp-fg hover:border-lp-faint ${focus}`}>Something else <ChevronDown size={14} /></button>
        )}
      </div>

      {goal && (
        <div ref={panel} className="mt-6 scroll-mt-20 rounded-[28px] border border-lp-line bg-lp-card p-6 sm:p-8 animate-[fadein_.25s_ease]" aria-live="polite">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-8">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-lp-accent">{goal.prompt}</p>
              <p className="mt-3 text-[17px] sm:text-[18px] leading-[1.6] text-lp-fg">{goal.answer}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/learn/do/${goal.id}`} className={`inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[15px] font-medium hover:bg-lp-btn-hover ${focus}`}>Open this route <ArrowRight size={16} /></Link>
                <Link href={goal.product.href} onClick={() => track('learn.try', { where: 'goal-picker', goal: goal.id })} className={`inline-flex items-center gap-2 h-11 px-4 rounded-full text-[15px] text-lp-accent hover:text-lp-fg ${focus}`}>{goal.product.label} <ArrowRight size={15} /></Link>
              </div>
            </div>
            <ol className="divide-y divide-[var(--lp-line)] border-t border-lp-line lg:border-t-0 lg:pt-0 pt-2">
              {goal.steps.map((s, i) => {
                const a = bySlug.get(s.slug)
                if (!a) return null
                return (
                  <li key={s.slug}>
                    <Link href={`/learn/${a.slug}?goal=${goal.id}`} className={`group grid grid-cols-[28px_1fr] gap-3 py-3.5 ${focus}`}>
                      <span className="text-[13px] tabular-nums text-lp-faint pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                      <span>
                        <span className="block text-[15.5px] font-semibold text-lp-fg group-hover:text-lp-accent leading-snug">{a.title}</span>
                        <span className="block mt-0.5 text-[13.5px] leading-snug text-lp-dim">{s.why}</span>
                        <span className="mt-1 flex items-center gap-3 text-[12px] text-lp-faint"><LevelTag level={a.level} /><span>{a.minutes} min</span></span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
