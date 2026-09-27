import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Clock, FileCheck2, Lock, Wallet } from 'lucide-react'
import { SITE } from '@/components/site/bits'
import { ApplyForm } from '@/components/research/ApplyForm'
import { DATES, INCENTIVE, PLACES } from '@/lib/research'

export const metadata: Metadata = {
  title: 'Working Designer Study · Voidcanvas',
  description: `Paid research for working designers in the UK and Nigeria. Take one real client job through Voidcanvas Studio and receive ${INCENTIVE}. Applications close ${DATES.closes}.`,
  alternates: { canonical: `${SITE}/research` },
  openGraph: { title: 'Voidcanvas Working Designer Study', description: `Take one real client job through Voidcanvas Studio and receive ${INCENTIVE}. UK and Nigeria.`, url: `${SITE}/research`, type: 'website' },
}

const STEPS: [string, string, string][] = [
  ['Six questions', 'About your last multi-format job, answered by voice note or text.', 'About 15 minutes'],
  ['One real client job', 'Take it through Voidcanvas Studio, from approved key visual to delivery package, with at least 3 formats.', DATES.jobWindow],
  ['Three closing questions', 'They appear when you download the delivery package.', 'About 2 minutes'],
]

const FACTS: [typeof Clock, string, string][] = [
  [Wallet, `${INCENTIVE} when you finish`, 'Or the naira equivalent, paid by bank transfer or PayPal within 7 days of confirming your details. Nothing to buy.'],
  [Lock, 'Your client work stays with you', 'Voidcanvas runs in your browser. We never upload, see or keep your design files. The study records timing, not designs.'],
  [Clock, 'Fits around real work', 'Use a job you already have. Keep your usual tools open in case you need them.'],
  [FileCheck2, 'Run properly', 'Clear terms, a consent form, a privacy notice and a findings summary sent to every participant by ' + DATES.findings + '.'],
]

export default function ResearchPage() {
  return (
    <div>
      <section className="relative">
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute left-1/2 top-[-30%] -translate-x-1/2 w-[900px] h-[520px] rounded-full bg-[radial-gradient(closest-side,var(--lp-glow),transparent)]" /></div>
        <div className="relative max-w-[900px] mx-auto px-5 sm:px-8 pt-14 sm:pt-24 text-center">
          <p className="text-[13px] sm:text-[14px] font-semibold text-lp-accent tracking-wide">Working Designer Study · UK and Nigeria</p>
          <h1 className="mt-3 text-[38px] sm:text-[64px] leading-[1.02] font-semibold tracking-[-0.04em] text-lp-fg">How long does it take to<br className="hidden sm:block" /> deliver every format?</h1>
          <p className="mt-6 text-[17px] sm:text-[20px] leading-relaxed text-lp-muted max-w-[700px] mx-auto">We are paying {PLACES} working designers {INCENTIVE} each to take one real client job through Voidcanvas Studio, so we can measure the work that happens after the key visual is approved.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#apply" className="inline-flex items-center h-12 px-7 rounded-full bg-lp-btn text-lp-btn-fg text-[16px] font-medium hover:bg-lp-btn-hover transition-colors">Apply by {DATES.closes.replace(' 2026', '')}</a>
            <Link href="/research/information" className="inline-flex items-center h-12 px-7 rounded-full border border-lp-line text-lp-fg text-[16px] font-medium hover:border-lp-faint transition-colors">Read the details</Link>
          </div>
        </div>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28">
        <h2 className="text-[26px] sm:text-[36px] font-semibold tracking-[-0.03em] text-lp-fg">What you would do</h2>
        <ol className="mt-8 grid md:grid-cols-3 gap-4">
          {STEPS.map(([t, d, when], i) => (
            <li key={t} className="rounded-[24px] bg-lp-card border border-lp-line p-6">
              <span className="text-[13px] font-semibold text-lp-accent tabular-nums">Step {i + 1}</span>
              <h3 className="mt-2 text-[20px] font-semibold tracking-tight text-lp-fg">{t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-lp-dim">{d}</p>
              <p className="mt-4 text-[13.5px] text-lp-faint">{when}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-16 sm:pt-20">
        <div className="grid sm:grid-cols-2 gap-4">
          {FACTS.map(([Icon, t, d]) => (
            <div key={t} className="rounded-[24px] border border-lp-line p-6 flex gap-4">
              <Icon size={22} className="text-lp-accent shrink-0 mt-0.5" aria-hidden />
              <div><h3 className="text-[17px] font-semibold text-lp-fg">{t}</h3><p className="mt-1.5 text-[15px] leading-relaxed text-lp-dim">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-16 sm:pt-20 grid lg:grid-cols-[1fr_1fr] gap-10">
        <div>
          <h2 className="text-[24px] sm:text-[30px] font-semibold tracking-[-0.02em] text-lp-fg">Who can take part</h2>
          <ul className="mt-5 space-y-2.5 text-[16px] leading-relaxed text-lp-text list-disc pl-5 marker:text-lp-faint">
            <li>Freelancers, studios of 1 to 10 people, or design leads at small agencies</li>
            <li>Based in the UK or Nigeria</li>
            <li>Delivered a job with 4 or more formats in the last 30 days</li>
            <li>Adapted those formats yourself</li>
            <li>18 or over</li>
          </ul>
        </div>
        <div>
          <h2 className="text-[24px] sm:text-[30px] font-semibold tracking-[-0.02em] text-lp-fg">Dates</h2>
          <dl className="mt-5 text-[15.5px] divide-y divide-[var(--lp-line)] border-y border-lp-line">
            {[['Applications close', DATES.closes], ['Everyone hears back', DATES.selection], ['Job window', DATES.jobWindow], ['Payment', `Within ${DATES.payWithin} of confirming your details`], ['Findings sent to you', DATES.findings]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-lp-dim">{k}</dt><dd className="text-lp-fg text-right">{v}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section id="apply" className="max-w-[760px] mx-auto px-5 sm:px-8 pt-20 sm:pt-28 scroll-mt-20">
        <h2 className="text-[28px] sm:text-[40px] font-semibold tracking-[-0.03em] text-lp-fg">Apply</h2>
        <p className="mt-3 text-[16.5px] leading-relaxed text-lp-muted">Two minutes. If you are selected, you will receive an invitation with the participant information, consent form and your personal study link on {DATES.selection}.</p>
        <div className="mt-8 rounded-[28px] bg-lp-card border border-lp-line p-5 sm:p-8"><Suspense><ApplyForm /></Suspense></div>
        <p className="mt-6 text-[13.5px] leading-relaxed text-lp-dim">
          Run by Voidcanvas, a product of MotionPlay Labs Ltd, registered in England and Wales (no. 17304660) and in Nigeria (RC 9621200).{' '}
          <Link href="/research/information" className="text-lp-accent hover:text-lp-fg">Participant information</Link> · <Link href="/research/terms" className="text-lp-accent hover:text-lp-fg">Incentive terms</Link> · <Link href="/research/privacy" className="text-lp-accent hover:text-lp-fg">Privacy notice</Link> · <a href="mailto:research@voidcanvas.app" className="text-lp-accent hover:text-lp-fg">research@voidcanvas.app</a>
        </p>
      </section>
    </div>
  )
}
