import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE } from '@/components/site/bits'
import { Doc, Table } from '@/components/research/Doc'
import { DATES, INCENTIVE, PLACES } from '@/lib/research'

export const metadata: Metadata = {
  title: 'Participant information · Working Designer Study · Voidcanvas',
  description: 'What the Voidcanvas Working Designer Study involves, who can take part, how your client work is protected and how you are paid.',
  alternates: { canonical: `${SITE}/research/information` },
}

export default function Information() {
  return (
    <Doc eyebrow="Working Designer Study" title="Participant information sheet" version={DATES.version}>
      <section>
        <h2>Who is running the study</h2>
        <p>Voidcanvas is a browser-based design tool made by MotionPlay Labs Ltd, a company registered in England and Wales (no. 17304660) and in Nigeria (RC 9621200). The study is led by Justin Ukaegbu, founder of Voidcanvas and a brand designer with over ten years of agency and freelance experience. Questions go to <a href="mailto:research@voidcanvas.app">research@voidcanvas.app</a>.</p>
      </section>
      <section>
        <h2>What the study is about</h2>
        <p>We are studying one part of design work: what happens after a client approves the key visual. Adapting it into every format, checking it, naming the files and delivering them. We want to measure how long that takes today, and whether Voidcanvas Studio makes it faster.</p>
        <p>We are testing the product, not you. Honest answers, including &ldquo;this was slower&rdquo;, are the most useful thing you can give us.</p>
      </section>
      <section>
        <h2>Who can take part</h2>
        <p>You can take part if all of these apply:</p>
        <ul>
          <li>You work as a freelancer, in a studio of 1 to 10 people, or lead design at a small agency</li>
          <li>You are based in the UK or Nigeria</li>
          <li>In the last 30 days, you delivered a job with 4 or more formats</li>
          <li>You adapted those formats yourself</li>
          <li>You are 18 or over</li>
        </ul>
        <p>There are up to {PLACES} places. If more people qualify than there are places, we select for a mix of countries, studio sizes and kinds of work. Applications close on {DATES.closes} and everyone who applies hears from us by {DATES.selection}.</p>
      </section>
      <section>
        <h2>What you will do</h2>
        <Table head={['Step', 'What', 'Time', 'When']} rows={[
          ['1', 'Answer six questions about your last multi-format job, by voice note or text', 'About 15 minutes', `By ${DATES.dueShort}`],
          ['2', 'Take one real client job through Voidcanvas Studio, from key visual to delivery package, with at least 3 formats', 'Your normal working time', DATES.jobWindow],
          ['3', 'Answer three short questions when you download the delivery package', 'About 2 minutes', 'Straight after step 2'],
        ]} />
        <p className="mt-4">For step 2, use a laptop or desktop with Chrome or Edge. You open Voidcanvas through your personal study link, which records the timing of the job for the study.</p>
      </section>
      <section>
        <h2>Your client&apos;s work</h2>
        <p>Voidcanvas runs in your browser. Your design files stay on your device. We never upload, see or keep them.</p>
        <p>What the study records: when you start and finish, how many formats you build, active time on the job, and any errors. It does not record your designs, text, images or file names. A screen recording is only made if you agree to it separately. If a job is under a confidentiality agreement, do not agree to screen recording for it.</p>
      </section>
      <section>
        <h2>Payment</h2>
        <p>When you have completed all three steps, we pay you {INCENTIVE}, or the naira equivalent at Wise&apos;s rate on the day we pay. Payment is made by bank transfer or PayPal within {DATES.payWithin} of you confirming your payout details. You do not need to buy anything to take part or to be paid. Full details are in the <Link href="/research/terms">incentive terms</Link>.</p>
      </section>
      <section>
        <h2>Risks</h2>
        <p>The risk is small. A new tool can take longer the first time you use it. Choose a job with some slack in the deadline, and keep your usual tools open so you can finish the job another way if you need to.</p>
      </section>
      <section>
        <h2>Taking part is your choice</h2>
        <p>You can withdraw at any time without giving a reason, from your study page or by replying &ldquo;withdraw&rdquo; to any study email. We will then delete your answers and recordings within 30 days. Withdrawing has no cost to you.</p>
      </section>
      <section>
        <h2>What happens to the results</h2>
        <p>We use the results to decide what to build next in Voidcanvas. Every participant receives a summary of the findings by {DATES.findings}. The summary may also be published. It will not name you or your clients, and quotes are only used if you agreed to it on the consent form.</p>
      </section>
      <section>
        <h2>Your data</h2>
        <p>How we store and use your information is set out in the <Link href="/research/privacy">privacy notice</Link>. Taking part is based on your consent, which you can withdraw at any time.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Research questions: <a href="mailto:research@voidcanvas.app">research@voidcanvas.app</a>. Complaints about how your data is handled can also go to the Information Commissioner&apos;s Office at <a href="https://ico.org.uk" target="_blank" rel="noopener">ico.org.uk</a>.</p>
      </section>
    </Doc>
  )
}
