import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE } from '@/components/site/bits'
import { DATES } from '@/lib/research'

export const metadata: Metadata = {
  title: 'Founding member · Voidcanvas Pro',
  description: 'Pre-order 12 months of Voidcanvas Pro at a founding price. Refundable until 14 days after launch. Every editing feature stays free.',
  alternates: { canonical: `${SITE}/founding` },
  robots: { index: false },
}

// Payment links are set when the Paystack (naira) and pound payment pages exist. Until then the buttons explain that.
const GBP_URL = process.env.NEXT_PUBLIC_FOUNDING_GBP_URL || ''
const NGN_URL = process.env.NEXT_PUBLIC_FOUNDING_NGN_URL || ''

const PRO: string[] = [
  'Sync across your devices, encrypted end to end',
  'Studio Share: review links your clients can open without an account, with pins and approvals',
  'Version history in the cloud',
  '25 GB of storage',
]

export default function Founding() {
  const btn = 'inline-flex items-center justify-center h-12 px-7 rounded-full text-[16px] font-medium transition-colors'
  return (
    <div className="max-w-[860px] mx-auto px-5 sm:px-8 pt-14 sm:pt-24">
      <p className="text-[13px] sm:text-[14px] font-semibold text-lp-accent tracking-wide">Voidcanvas Pro · Founding member</p>
      <h1 className="mt-3 text-[36px] sm:text-[56px] leading-[1.03] font-semibold tracking-[-0.035em] text-lp-fg">Pay once now. Your year starts when Pro does.</h1>
      <p className="mt-5 text-[17px] sm:text-[19px] leading-relaxed text-lp-muted max-w-[680px]">Every editing, Studio, Effects and export feature in Voidcanvas stays free. Pro is for the parts that cost us money to run. Founding members pre-order it at a lower price, held for as long as they stay.</p>

      <div className="mt-10 grid md:grid-cols-2 gap-4">
        <div className="rounded-[24px] bg-lp-card border border-lp-line p-6 sm:p-7">
          <h2 className="text-[18px] font-semibold text-lp-fg">What Pro is planned to include</h2>
          <ul className="mt-4 space-y-2.5 text-[15.5px] leading-relaxed text-lp-text list-disc pl-5 marker:text-lp-faint">{PRO.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
        <div className="rounded-[24px] bg-lp-card border border-lp-line p-6 sm:p-7">
          <h2 className="text-[18px] font-semibold text-lp-fg">Price</h2>
          <dl className="mt-4 text-[15.5px] divide-y divide-[var(--lp-line)]">
            <div className="flex justify-between py-2.5"><dt className="text-lp-dim">Founding member, UK</dt><dd className="text-lp-fg font-semibold">£48 a year</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-lp-dim">Founding member, Nigeria</dt><dd className="text-lp-fg font-semibold">₦28,000 a year</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-lp-dim">Planned Pro price</dt><dd className="text-lp-dim">£60 or ₦35,000 a year</dd></div>
          </dl>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-lp-line p-6 sm:p-7">
        <h2 className="text-[18px] font-semibold text-lp-fg">How it works</h2>
        <ul className="mt-4 space-y-2 text-[15.5px] leading-relaxed text-lp-text list-disc pl-5 marker:text-lp-faint">
          <li>You pay now. Your 12 months start the day Pro launches, not today.</li>
          <li>Your founding price stays for as long as you remain a member.</li>
          <li>Full refund at any time before Pro launches, and for 14 days after.</li>
          <li>If Pro has not launched by 30 June 2027, we refund you automatically.</li>
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {GBP_URL ? <a href={GBP_URL} className={`${btn} bg-lp-btn text-lp-btn-fg hover:bg-lp-btn-hover`}>Become a Founding member, £48</a> : null}
        {NGN_URL ? <a href={NGN_URL} className={`${btn} bg-lp-btn text-lp-btn-fg hover:bg-lp-btn-hover`}>Become a Founding member, ₦28,000</a> : null}
        {!GBP_URL && !NGN_URL && <p className="text-[15px] text-lp-muted">Payment opens shortly. To reserve a place now, email <a href="mailto:hello@voidcanvas.app" className="text-lp-accent">hello@voidcanvas.app</a>.</p>}
      </div>
      <p className="mt-5 text-[14px] text-lp-dim">Offered until 23:59 UK time on {DATES.foundingCloses}. Read the full <Link href="/founding-terms" className="text-lp-accent hover:text-lp-fg">Founding member terms</Link>. Buying or not buying has no effect on any study payment.</p>
    </div>
  )
}
