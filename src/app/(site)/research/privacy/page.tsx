import type { Metadata } from 'next'
import { SITE } from '@/components/site/bits'
import { Doc, Table } from '@/components/research/Doc'
import { DATES, REGISTERED_OFFICE } from '@/lib/research'

export const metadata: Metadata = {
  title: 'Privacy notice · Working Designer Study · Voidcanvas',
  description: 'What the Voidcanvas Working Designer Study collects, why, where it is stored, how long it is kept and your rights.',
  alternates: { canonical: `${SITE}/research/privacy` },
}

// The ICO registration number is added here once it is issued.
const ICO_NUMBER: string | null = null

export default function Privacy() {
  return (
    <Doc eyebrow="Working Designer Study" title="How we handle your information" version={DATES.version}>
      <section>
        <h2>Who is responsible</h2>
        <p>MotionPlay Labs Ltd is the data controller. Registered in England and Wales, no. 17304660. Registered office: {REGISTERED_OFFICE}. {ICO_NUMBER ? <>ICO registration number: {ICO_NUMBER}. </> : null}Contact: <a href="mailto:research@voidcanvas.app">research@voidcanvas.app</a>.</p>
      </section>
      <section>
        <h2>What we collect</h2>
        <Table head={['Information', 'Why', 'Kept until']} rows={[
          ['Name, email, country and your application answers', 'To select participants and contact you about the study', `${DATES.dataDeleted}, then deleted`],
          ['Interview answers (text and voice notes)', 'To understand how you work today', `Voice notes: ${DATES.voiceDeleted}. Transcripts: kept with names and identifying details removed`],
          ['Timing and usage data from your study link', 'To measure how long the job took and where you got stuck', `Kept without your name after ${DATES.dataDeleted}`],
          ['Closing question answers', 'To compare against your usual working time', 'As for interview answers'],
          ['Screen recording (only if you agreed)', 'To see where the product slowed you down', DATES.voiceDeleted],
          ['Payout details', 'To pay you', 'Deleted 30 days after payment. Payment records kept for 6 years for accounting, as the law requires'],
        ]} />
        <p className="mt-4">We do not collect your design files, images, text or file names. Voidcanvas runs in your browser and your files stay on your device.</p>
      </section>
      <section>
        <h2>Legal basis</h2>
        <p>We rely on your consent. You can withdraw it at any time from your study page or by replying &ldquo;withdraw&rdquo; to any study email. Payment records are kept because the law requires us to keep accounting records.</p>
      </section>
      <section>
        <h2>Who else handles your data</h2>
        <Table head={['Service', 'What for', 'Where']} rows={[
          ['Supabase', 'Study database and voice note storage', 'London, UK'],
          ['MailerLite', 'Study emails', 'European Union'],
          ['Wise or PayPal', 'Paying you', 'UK and your country of payment'],
        ]} />
        <p className="mt-4">No one else receives your information. We do not sell it or use it for advertising.</p>
      </section>
      <section>
        <h2>Transfers</h2>
        <p>If you are in Nigeria, your information is stored in the UK. We protect this transfer as the Nigeria Data Protection Act 2023 requires, and apply the same protections to everyone in the study.</p>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>You can ask to see the information we hold about you, correct it, delete it, or take a copy. Email <a href="mailto:research@voidcanvas.app">research@voidcanvas.app</a> and we will reply within 30 days. You can complain to the Information Commissioner&apos;s Office (<a href="https://ico.org.uk" target="_blank" rel="noopener">ico.org.uk</a>) in the UK, or the Nigeria Data Protection Commission (<a href="https://ndpc.gov.ng" target="_blank" rel="noopener">ndpc.gov.ng</a>) in Nigeria.</p>
      </section>
      <section>
        <h2>Quotes</h2>
        <p>We only quote you in published findings if you agreed on the consent form. Quotes never include your name or your clients&apos; names.</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>If this notice changes during the study, we will email you before the change takes effect.</p>
      </section>
    </Doc>
  )
}
