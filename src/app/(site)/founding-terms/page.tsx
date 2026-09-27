import type { Metadata } from 'next'
import { SITE } from '@/components/site/bits'
import { Doc } from '@/components/research/Doc'
import { DATES, REGISTERED_OFFICE } from '@/lib/research'

export const metadata: Metadata = {
  title: 'Founding member terms · Voidcanvas',
  description: 'Terms for the Voidcanvas Founding member plan: a refundable pre-order of 12 months of Voidcanvas Pro at a founding price.',
  alternates: { canonical: `${SITE}/founding-terms` },
}

export default function FoundingTerms() {
  return (
    <Doc eyebrow="Voidcanvas Pro" title="Founding member terms" version={DATES.version}>
      <ol>
        <li><strong>Who you are buying from.</strong> MotionPlay Labs Ltd, registered in England and Wales (no. 17304660), registered office {REGISTERED_OFFICE}.</li>
        <li><strong>What it is.</strong> A pre-order of 12 months of Voidcanvas Pro at a founding price. Pro is not available yet.</li>
        <li><strong>What Pro is planned to include.</strong> Sync across your devices with end-to-end encryption; Studio Share, review links your clients can open without an account, with pins and approvals; version history in the cloud; 25 GB of storage. The final feature list is confirmed when Pro launches. If Pro launches without a feature listed here, you can ask for a full refund.</li>
        <li><strong>What stays free.</strong> Every editing, Studio, Effects and export feature stays free for everyone, whether or not you are a member.</li>
        <li><strong>Price.</strong> £48 for 12 months, or ₦28,000 for 12 months. The planned Pro price is £60 or ₦35,000 a year.</li>
        <li><strong>When your 12 months start.</strong> On the day Pro launches, not the day you pay. We email you when it launches.</li>
        <li><strong>Founding price held.</strong> Your founding price applies to every renewal for as long as you stay a member without a break. We will email you at least 14 days before any renewal, and you can cancel at any time before it.</li>
        <li><strong>Refunds.</strong> You can have a full refund, for any reason:
          <ol className="mt-2"><li>at any time before Pro launches, and</li><li>within 14 days after Pro launches.</li></ol>
        </li>
        <li><strong>Automatic refund.</strong> If Pro has not launched by 30 June 2027, we refund you in full without you needing to ask.</li>
        <li><strong>How refunds are paid.</strong> To the card or account you paid with, within 14 days of your request.</li>
        <li><strong>Availability.</strong> Offered until 23:59 UK time on {DATES.foundingCloses}.</li>
        <li><strong>Separate from the study.</strong> Buying or not buying has no effect on any study payment.</li>
        <li><strong>Questions.</strong> <a href="mailto:hello@voidcanvas.app">hello@voidcanvas.app</a></li>
      </ol>
    </Doc>
  )
}
