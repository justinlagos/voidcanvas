import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Eyebrow, SITE } from '@/components/site/bits'
import { BugReportForm } from '@/components/site/BugReportForm'

export const metadata: Metadata = {
  title: 'Report a bug · Voidcanvas',
  description: 'Something not working in Voidcanvas? Tell us what happened. Your designs are never sent.',
  alternates: { canonical: `${SITE}/report-a-bug` },
}

export default function ReportBug() {
  return (
    <div className="max-w-[1120px] mx-auto px-5 sm:px-8 pt-14 sm:pt-20">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-12 lg:gap-16">
        <div className="min-w-0">
          <Eyebrow>Report a bug</Eyebrow>
          <h1 className="mt-3 text-[38px] sm:text-[56px] leading-[1.02] font-semibold tracking-[-0.035em] text-lp-fg">Something broke?<br />Tell us what happened.</h1>
          <p className="mt-4 text-[17px] sm:text-[19px] text-lp-muted max-w-[600px]">Only the first question is required. The steps you took are what gets a bug fixed fastest. You can also report from inside the app, under Help, without leaving your work.</p>
          <div className="mt-10 rounded-[28px] bg-lp-card border border-lp-line p-5 sm:p-8"><Suspense><BugReportForm /></Suspense></div>
        </div>

        <aside className="space-y-8 text-[14.5px] leading-relaxed lg:pt-40">
          <div>
            <h2 className="text-[15px] font-semibold text-lp-fg">Before you send</h2>
            <ul className="mt-3 space-y-2 text-lp-dim list-disc pl-5 marker:text-lp-faint">
              <li>Reload the page and try once more. If it happens again, that is worth saying.</li>
              <li>Check <Link href="/learn/troubleshooting" className="text-lp-accent hover:text-lp-fg">Troubleshooting</Link> for fonts, exports, storage and slow designs.</li>
              <li>Export anything you cannot lose before you try again.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-lp-fg">What happens next</h2>
            <p className="mt-3 text-lp-dim">Every report is read. If you leave an email, you will hear back when there is a question or a fix. If not, the report is still looked at.</p>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-lp-fg">Your privacy</h2>
            <p className="mt-3 text-lp-dim">Your images, file names and designs are never sent. Technical details are optional and you can see every value before sending. <Link href="/learn/privacy-and-data" className="text-lp-accent hover:text-lp-fg">What Voidcanvas sends</Link>.</p>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-lp-fg">Not a bug?</h2>
            <p className="mt-3 text-lp-dim">For ideas and requests, use the feedback form at the bottom of this page. For how-to questions, <Link href="/learn" className="text-lp-accent hover:text-lp-fg">Learn</Link> has a guide for every feature.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
