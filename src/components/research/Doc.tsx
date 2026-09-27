// Layout for the study's documents (information sheet, terms, privacy, Founding member terms). Server-safe.
import Link from 'next/link'
import type { ReactNode } from 'react'

export function Doc({ eyebrow, title, version, children }: { eyebrow: string; title: string; version: string; children: ReactNode }) {
  return (
    <article className="max-w-[760px] mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-8">
      <p className="text-[13px] sm:text-[14px] font-semibold text-lp-accent tracking-wide">{eyebrow}</p>
      <h1 className="mt-3 text-[32px] sm:text-[44px] leading-[1.05] font-semibold tracking-[-0.03em] text-lp-fg">{title}</h1>
      <p className="mt-3 text-[13.5px] text-lp-faint">{version}</p>
      <div className="mt-10 space-y-8 text-[16px] leading-[1.75] text-lp-text [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-lp-fg [&_h2]:mb-2 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2 [&_li]:marker:text-lp-faint [&_a]:text-lp-accent [&_a:hover]:text-lp-fg [&_strong]:text-lp-fg [&_strong]:font-semibold">
        {children}
      </div>
      <nav className="mt-14 pt-6 border-t border-lp-line text-[14px] text-lp-dim flex flex-wrap gap-x-5 gap-y-2" aria-label="Study documents">
        <Link href="/research" className="text-lp-accent hover:text-lp-fg">The study</Link>
        <Link href="/research/information" className="text-lp-accent hover:text-lp-fg">Participant information</Link>
        <Link href="/research/terms" className="text-lp-accent hover:text-lp-fg">Incentive terms</Link>
        <Link href="/research/privacy" className="text-lp-accent hover:text-lp-fg">Privacy notice</Link>
      </nav>
    </article>
  )
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-lp-line">
      <table className="w-full text-[14.5px] leading-relaxed">
        <thead className="bg-lp-panel text-left text-lp-fg"><tr>{head.map(h => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-lp-line align-top">{r.map((c, j) => <td key={j} className="px-4 py-3 text-lp-text">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
