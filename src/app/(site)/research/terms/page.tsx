import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE } from '@/components/site/bits'
import { Doc } from '@/components/research/Doc'
import { DATES, INCENTIVE, REGISTERED_OFFICE } from '@/lib/research'

export const metadata: Metadata = {
  title: 'Incentive terms · Working Designer Study · Voidcanvas',
  description: 'How and when participants in the Voidcanvas Working Designer Study are paid. No purchase is needed.',
  alternates: { canonical: `${SITE}/research/terms` },
}

export default function Terms() {
  return (
    <Doc eyebrow="Working Designer Study" title="Incentive terms" version={DATES.version}>
      <ol>
        <li><strong>Who pays.</strong> The incentive is paid by MotionPlay Labs Ltd, registered in England and Wales (no. 17304660), registered office {REGISTERED_OFFICE}.</li>
        <li><strong>Amount.</strong> Each participant who completes the study receives {INCENTIVE}. Participants paid in Nigeria receive the naira equivalent of {INCENTIVE} at Wise&apos;s exchange rate on the day of payment.</li>
        <li><strong>No purchase.</strong> You do not need to buy anything, subscribe to anything or pay any fee to take part or to be paid. We will never ask you to send money to receive this payment.</li>
        <li><strong>What counts as complete.</strong> You complete the study when all of these are done by {DATES.due}:
          <ol className="mt-2">
            <li>You have signed the consent form.</li>
            <li>You have answered the six interview questions.</li>
            <li>You have taken one real client job through Voidcanvas Studio using your study link, with at least 3 formats, up to downloading the delivery package.</li>
            <li>You have answered the three closing questions.</li>
          </ol>
        </li>
        <li><strong>Real work.</strong> The job in step 3 must be real work for a client. Test files or repeated downloads of the same package do not count. We may ask you to confirm the job in a short reply, without naming the client.</li>
        <li><strong>How you are paid.</strong> After you complete, we email you a secure link to confirm your payout details. You can choose a UK bank transfer, a Nigerian bank transfer in naira, or PayPal. We pay within {DATES.payWithin} of receiving your details and email you a payment reference.</li>
        <li><strong>What we never ask for.</strong> We never ask for passwords, card numbers, PINs or one-time codes.</li>
        <li><strong>One payment per person.</strong> Each person can be paid once, whatever the number of jobs they complete.</li>
        <li><strong>Withdrawing.</strong> You can withdraw at any time. The incentive is for completing the study, so it is not paid if you withdraw before completing. Withdrawing has no other effect.</li>
        <li><strong>Unclaimed payments.</strong> If you have not confirmed your payout details by {DATES.unclaimedReminder}, we will send one reminder. Payments still unclaimed on {DATES.unclaimedLapse} lapse.</li>
        <li><strong>Tax.</strong> The payment is a thank-you for your time. You are responsible for declaring it if your tax rules require it.</li>
        <li><strong>Separate from any purchase.</strong> Buying a Voidcanvas plan, including the <Link href="/founding-terms">Founding member plan</Link>, has no effect on whether or when you are paid, and not buying one has no effect either.</li>
        <li><strong>Changes.</strong> If we need to change these terms, we will email every participant before the change takes effect. A change will never reduce a payment for work already completed.</li>
        <li><strong>Questions.</strong> <a href="mailto:research@voidcanvas.app">research@voidcanvas.app</a></li>
      </ol>
    </Doc>
  )
}
