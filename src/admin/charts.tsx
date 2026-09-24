'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Dark-surface chart tokens (reference palette, dark steps). Text always uses ink tokens, never series colour.
export const C = {
  surface: '#131318',
  grid: 'rgba(255,255,255,0.06)',
  axis: '#747484',
  ink: '#eeeef0',
  ink2: '#b8b8c1',
  muted: '#747484',
  s1: '#3987e5',
  s1soft: 'rgba(57,135,229,0.35)',
  s2: '#d95926',
}

function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ro = new ResizeObserver(e => setW(Math.max(260, Math.round(e[0].contentRect.width))))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  return [ref, w]
}

function niceMax(v: number) {
  if (v <= 4) return 4
  const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}
const fmtN = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)))
const fmtDay = (s: string, long = false) => { const d = new Date(s + 'T12:00:00'); return d.toLocaleDateString('en-GB', long ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' }) }

/** Daily bars for one measure at a time, with a hover tooltip per day. */
export function DailyBars({ rows, label }: { rows: { dt: string; v: number }[]; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const h = 220, padL = 36, padR = 8, padT = 12, padB = 26
  const max = niceMax(Math.max(1, ...rows.map(r => r.v)))
  const iw = w - padL - padR, ih = h - padT - padB
  const step = iw / Math.max(1, rows.length)
  const bw = Math.max(2, Math.min(28, step - 2))
  const y = (v: number) => padT + ih - (v / max) * ih
  const ticks = [0, max / 2, max]
  const every = Math.ceil(rows.length / Math.max(2, Math.floor(iw / 64)))
  const hr = hover !== null ? rows[hover] : null
  return (
    <div ref={ref} className="relative select-none">
      <svg width={w} height={h} role="img" aria-label={`${label} per day`} onPointerLeave={() => setHover(null)}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke={C.grid} />
            <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={C.axis}>{fmtN(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const x = padL + i * step + (step - bw) / 2
          const top = y(r.v); const bh = Math.max(0, padT + ih - top)
          const rad = Math.min(4, bw / 2, bh)
          return (
            <g key={r.dt}>
              {bh > 0 && <path d={`M${x},${padT + ih} V${top + rad} Q${x},${top} ${x + rad},${top} H${x + bw - rad} Q${x + bw},${top} ${x + bw},${top + rad} V${padT + ih} Z`} fill={hover === null || hover === i ? C.s1 : C.s1soft} />}
              <rect x={padL + i * step} y={padT} width={step} height={ih} fill="transparent" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
              {i % every === 0 && <text x={padL + i * step + step / 2} y={h - 8} textAnchor="middle" fontSize="11" fill={C.axis}>{fmtDay(r.dt)}</text>}
            </g>
          )
        })}
        <line x1={padL} x2={w - padR} y1={padT + ih} y2={padT + ih} stroke="rgba(255,255,255,0.14)" />
      </svg>
      {hr && hover !== null && (
        <div className="pointer-events-none absolute top-1 z-10 px-2.5 py-1.5 rounded-lg bg-[#26262e] border border-void-700 shadow-xl text-[12px] whitespace-nowrap"
          style={{ left: Math.min(w - 150, Math.max(0, padL + hover * step + step / 2 - 60)) }}>
          <div className="text-void-400">{fmtDay(hr.dt, true)}</div>
          <div className="text-void-50 font-medium tabular-nums">{hr.v.toLocaleString()} {label.toLowerCase()}</div>
        </div>
      )}
    </div>
  )
}

/** Ranked horizontal bars with the value written at the end. */
export function Ranked({ rows, empty = 'Nothing yet', max: maxRows = 10, suffix }: { rows: { label: ReactNode; v: number; sub?: string; key: string }[]; empty?: string; max?: number; suffix?: (v: number) => string }) {
  const [all, setAll] = useState(false)
  if (!rows.length) return <p className="text-[13px] text-void-500 py-6 text-center">{empty}</p>
  const top = Math.max(...rows.map(r => r.v)) || 1
  const shown = all ? rows : rows.slice(0, maxRows)
  return (
    <div>
      <ul className="space-y-1.5">
        {shown.map(r => (
          <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3" title={`${r.v.toLocaleString()}${r.sub ? ' · ' + r.sub : ''}`}>
            <div className="relative h-8 rounded-md overflow-hidden">
              <div className="absolute inset-y-0 left-0 rounded-md" style={{ width: `${Math.max(2, (r.v / top) * 100)}%`, background: 'rgba(57,135,229,0.28)' }} />
              <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-md" style={{ background: C.s1 }} />
              <span className="relative z-[1] flex items-center h-full pl-3 pr-2 text-[12.5px] text-void-100 truncate">{r.label}</span>
            </div>
            <span className="text-[12.5px] tabular-nums text-void-200 text-right min-w-[3ch]">{suffix ? suffix(r.v) : r.v.toLocaleString()}{r.sub && <span className="text-void-500 ml-1.5">{r.sub}</span>}</span>
          </li>
        ))}
      </ul>
      {rows.length > maxRows && <button onClick={() => setAll(!all)} className="mt-2 text-[12px] text-accent-light hover:text-white">{all ? 'Show fewer' : `Show all ${rows.length}`}</button>}
    </div>
  )
}

/** Four-step journey. Width is share of all visits; the small number is the step-to-step rate. */
export function Funnel({ steps }: { steps: { label: string; v: number }[] }) {
  const first = steps[0]?.v || 0
  if (!first) return <p className="text-[13px] text-void-500 py-6 text-center">No visits yet</p>
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const share = s.v / first
        const stepRate = i === 0 ? null : steps[i - 1].v ? s.v / steps[i - 1].v : 0
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between text-[12.5px] mb-1">
              <span className="text-void-200">{s.label}</span>
              <span className="tabular-nums text-void-100">{s.v.toLocaleString()} <span className="text-void-500">· {Math.round(share * 100)}%</span></span>
            </div>
            <div className="h-7 rounded-md bg-void-900 overflow-hidden"><div className="h-full rounded-md" style={{ width: `${Math.max(1.5, share * 100)}%`, background: C.s1 }} /></div>
            {stepRate !== null && <p className={`mt-1 text-[11.5px] ${stepRate < 0.4 ? 'text-amber-300' : 'text-void-500'}`}>{Math.round(stepRate * 100)}% of the step before{stepRate < 0.4 ? ', the weak point' : ''}</p>}
          </li>
        )
      })}
    </ol>
  )
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
function mix(a: string, b: string, t: number) {
  const p = (s: string) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`
}

/** Visits by weekday and hour. One hue, darker to lighter as it gets busier. */
export function Heatmap({ cells }: { cells: { dow: number; hour: number; n: number }[] }) {
  const [hover, setHover] = useState<{ dow: number; hour: number; n: number } | null>(null)
  const m = new Map(cells.map(c => [`${c.dow}-${c.hour}`, c.n]))
  const max = Math.max(1, ...cells.map(c => c.n))
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: '36px repeat(24, minmax(0,1fr))' }} onPointerLeave={() => setHover(null)}>
          {DOW.map((d, di) => (
            <div key={d} className="contents">
              <span className="text-[11px] text-void-500 flex items-center">{d}</span>
              {Array.from({ length: 24 }).map((_, h) => {
                const n = m.get(`${di + 1}-${h}`) || 0
                return <span key={h} onPointerEnter={() => setHover({ dow: di, hour: h, n })} className="h-5 rounded-[3px]" style={{ background: n ? mix('#172a45', '#86b6ef', Math.sqrt(n / max)) : 'rgba(255,255,255,0.03)' }} />
              })}
            </div>
          ))}
          <span />
          {Array.from({ length: 24 }).map((_, h) => <span key={h} className="text-[10px] text-void-500 text-center">{h % 3 === 0 ? h : ''}</span>)}
        </div>
        <p className="mt-2 text-[12px] text-void-400 h-4">{hover ? `${DOW[hover.dow]} ${String(hover.hour).padStart(2, '0')}:00 Lagos time: ${hover.n} visit${hover.n === 1 ? '' : 's'}` : 'Hover a square for the count. Lighter means busier.'}</p>
      </div>
    </div>
  )
}
