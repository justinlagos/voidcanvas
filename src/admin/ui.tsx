'use client'

import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { change, fmtPct } from './data'

export const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function Card({ title, sub, children, className = '', right }: { title: string; sub?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`rounded-2xl bg-[#131318] border border-void-800/80 p-4 sm:p-5 min-w-0 ${className}`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div><h2 className="text-[14px] font-semibold text-void-50">{title}</h2>{sub && <p className="text-[12px] text-void-500 mt-0.5">{sub}</p>}</div>
        {right}
      </header>
      {children}
    </section>
  )
}

export function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  const c = change(cur, prev)
  if (c === null) return <span className="text-[11.5px] text-void-500">new</span>
  if (Math.abs(c) < 0.005) return <span className="text-[11.5px] text-void-500">no change</span>
  const up = c > 0; const good = invert ? !up : up
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return <span className={`inline-flex items-center gap-0.5 text-[11.5px] tabular-nums ${good ? 'text-emerald-400' : 'text-rose-400'}`}><Icon size={13} />{fmtPct(Math.abs(c))}</span>
}

export function Kpi({ label, value, foot }: { label: string; value: string; foot?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#131318] border border-void-800/80 px-4 py-3.5 min-w-0">
      <p className="text-[12px] text-void-400 truncate">{label}</p>
      <p className="mt-1 text-[26px] leading-none font-semibold tracking-tight tabular-nums text-void-50">{value}</p>
      <div className="mt-2 h-4 text-[11.5px] text-void-500 truncate">{foot}</div>
    </div>
  )
}

