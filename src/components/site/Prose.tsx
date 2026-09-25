// Renders Learn and Blog content blocks. Server component: no JavaScript is shipped for the text itself.
import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'
import { ArrowRight, Info, Lightbulb, AlertTriangle } from 'lucide-react'
import type { Block } from '@/content/types'
import { slugify } from '@/content/util'

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** Splits "Ctrl+Shift+]" or "Ctrl++" into keys. */
export function splitKeys(combo: string): string[] {
  const parts: string[] = []
  let s = combo
  while (s) {
    const i = s.indexOf('+', 1)
    if (i < 0) { parts.push(s); break }
    parts.push(s.slice(0, i)); s = s.slice(i + 1)
  }
  return parts
}

export function Kbd({ k }: { k: string }) {
  return <kbd data-k={k} className="inline-flex items-center justify-center min-w-[1.6em] h-[1.55em] px-[0.4em] rounded-[5px] border border-lp-line border-b-2 bg-lp-panel font-mono text-[0.8em] leading-none text-lp-fg align-[0.08em] whitespace-nowrap">{k}</kbd>
}

/** A key combination. Lowercase words such as "drag" or "click" stay as text. */
export function Keys({ combo }: { combo: string }) {
  const parts = splitKeys(combo)
  return (
    <span className="inline-flex items-center gap-[0.2em] flex-wrap">
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-lp-faint text-[0.8em]">+</span>}
          {/^[a-z]{2,}$/.test(p) ? <span className="text-lp-dim">{p}</span> : <Kbd k={p} />}
        </Fragment>
      ))}
    </span>
  )
}

const TOKEN = /(\*\*[^*]+?\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\{\{[^}]+\}\})/g

/** **bold**, `code`, [label](href), {{Ctrl+K}} */
export function Inline({ text }: { text: string }): JSX.Element {
  const out: ReactNode[] = []
  text.split(TOKEN).forEach((part, i) => {
    if (!part) return
    if (part.startsWith('**') && part.endsWith('**')) out.push(<strong key={i} className="font-semibold text-lp-fg"><Inline text={part.slice(2, -2)} /></strong>)
    else if (part.startsWith('`') && part.endsWith('`')) out.push(<code key={i} className="px-[0.35em] py-[0.1em] rounded-md bg-lp-panel border border-lp-line font-mono text-[0.86em] text-lp-fg break-words">{part.slice(1, -1)}</code>)
    else if (part.startsWith('{{')) out.push(<Keys key={i} combo={part.slice(2, -2)} />)
    else if (part.startsWith('[')) {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part)
      if (!m) { out.push(part); return }
      const [, label, href] = m
      const cls = `text-lp-accent underline decoration-[var(--lp-line)] underline-offset-[3px] hover:decoration-current rounded-sm ${focus}`
      out.push(href.startsWith('http')
        ? <a key={i} href={href} target="_blank" rel="noopener" className={cls}>{label}</a>
        : <Link key={i} href={href} className={cls}>{label}</Link>)
    } else out.push(part)
  })
  return <>{out}</>
}

const CALLOUT = {
  tip: { Icon: Lightbulb, label: 'Tip', cls: 'border-emerald-500/30 bg-emerald-500/[0.06]', ic: 'text-emerald-500' },
  note: { Icon: Info, label: 'Note', cls: 'border-sky-500/30 bg-sky-500/[0.06]', ic: 'text-sky-500' },
  warn: { Icon: AlertTriangle, label: 'Watch out', cls: 'border-amber-500/40 bg-amber-500/[0.07]', ic: 'text-amber-500' },
}

export function Prose({ body }: { body: Block[] }) {
  const ids = new Map<string, number>()
  const anchor = (t: string) => { const b = slugify(t) || 'section'; const n = ids.get(b) ?? 0; ids.set(b, n + 1); return n ? `${b}-${n}` : b }
  return (
    <div className="lp-prose text-[16.5px] sm:text-[17px] leading-[1.7] text-lp-text">
      {body.map((b, i) => {
        switch (b.t) {
          case 'p': return <p key={i}><Inline text={b.text} /></p>
          case 'h': { const id = anchor(b.text); return <h2 key={i} id={id} className="group scroll-mt-20 text-[24px] sm:text-[28px] leading-tight font-semibold tracking-[-0.02em] text-lp-fg"><a href={`#${id}`} className="no-underline">{<Inline text={b.text} />}<span aria-hidden className="ml-2 text-lp-faint opacity-0 group-hover:opacity-100 transition-opacity">#</span></a></h2> }
          case 'h3': { const id = anchor(b.text); return <h3 key={i} id={id} className="scroll-mt-20 text-[19px] sm:text-[20px] font-semibold tracking-tight text-lp-fg"><Inline text={b.text} /></h3> }
          case 'steps': return (
            <ol key={i} className="lp-steps space-y-3">
              {b.items.map((it, j) => <li key={j} className="relative pl-10"><span aria-hidden className="absolute left-0 top-[0.15em] w-7 h-7 rounded-full bg-lp-panel border border-lp-line text-[13px] font-semibold text-lp-fg flex items-center justify-center">{j + 1}</span><Inline text={it} /></li>)}
            </ol>)
          case 'list': return <ul key={i} className="space-y-2 pl-5 list-disc marker:text-lp-faint">{b.items.map((it, j) => <li key={j} className="pl-1"><Inline text={it} /></li>)}</ul>
          case 'tip': case 'note': case 'warn': {
            const c = CALLOUT[b.t]
            return (
              <aside key={i} className={`flex gap-3 rounded-2xl border px-4 sm:px-5 py-4 text-[15.5px] ${c.cls}`}>
                <c.Icon size={18} className={`shrink-0 mt-[3px] ${c.ic}`} aria-hidden />
                <div><span className="sr-only">{c.label}: </span><Inline text={b.text} /></div>
              </aside>)
          }
          case 'table': return (
            <div key={i} className="overflow-x-auto rounded-2xl border border-lp-line -mx-1 sm:mx-0">
              <table className="w-full text-[14.5px] leading-snug">
                <thead className="bg-lp-panel text-left"><tr>{b.head.map((h, j) => <th key={j} scope="col" className="px-4 py-3 font-semibold text-lp-fg whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j} className="border-t border-lp-line align-top">{r.map((c, k) => <td key={k} className={`px-4 py-3 ${k === 0 ? 'font-medium text-lp-fg' : 'text-lp-muted'}`}><Inline text={c} /></td>)}</tr>)}</tbody>
              </table>
            </div>)
          case 'keys': return (
            <div key={i} className="rounded-2xl border border-lp-line overflow-hidden">
              <dl className="divide-y divide-[var(--lp-line)] text-[15px]">
                {b.rows.map(([k, what], j) => {
                  const m = /^(\S+)(\s.*)?$/.exec(k)
                  return (
                    <div key={j} className="grid grid-cols-[minmax(0,11rem)_1fr] sm:grid-cols-[14rem_1fr] gap-4 px-4 py-2.5">
                      <dt className="text-lp-fg">{m ? <><Keys combo={m[1]} />{m[2] && <span className="text-lp-dim text-[13.5px]">{m[2]}</span>}</> : k}</dt>
                      <dd className="text-lp-muted"><Inline text={what} /></dd>
                    </div>)
                })}
              </dl>
            </div>)
          case 'quote': return <blockquote key={i} className="border-l-2 border-accent pl-5 text-[19px] leading-relaxed text-lp-fg">“<Inline text={b.text} />”{b.by && <footer className="mt-2 text-[14px] text-lp-dim">{b.by}</footer>}</blockquote>
          case 'try': return (
            <p key={i} className="!mt-8">
              <Link href={b.href} className={`inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[15px] font-medium hover:bg-lp-btn-hover transition-colors ${focus}`}>{b.label} <ArrowRight size={16} /></Link>
            </p>)
        }
      })}
    </div>
  )
}

/** The h2 headings, for "On this page". Same ids as Prose gives them. */
export function outline(body: Block[]) {
  const ids = new Map<string, number>()
  const out: { id: string; text: string }[] = []
  for (const b of body) {
    if (b.t !== 'h' && b.t !== 'h3') continue
    const base = slugify(b.text) || 'section'; const n = ids.get(base) ?? 0; ids.set(base, n + 1)
    if (b.t === 'h') out.push({ id: n ? `${base}-${n}` : base, text: b.text })
  }
  return out
}
