'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ClosingForm } from '@/components/research/ClosingForm'
import { Card, Loading, Notice, StudyFooterLinks, StudyFrame, useParticipant } from '@/components/research/ui'
import type { StudyView } from '@/lib/research'

export default function ClosingPage() {
  const { token, view, error } = useParticipant()
  const [job, setJob] = useState<string | null>(null)
  const [done, setDone] = useState<StudyView | null>(null)
  useEffect(() => { setJob(new URLSearchParams(location.search).get('job')) }, [])
  const target = view?.jobs.find(j => j.key === job) || view?.jobs.find(j => j.delivered && !j.closed)

  return (
    <StudyFrame eyebrow="Working Designer Study" title="Three closing questions">
      {error && <Notice kind="error">{error}</Notice>}
      {!error && !view && <Loading />}
      {view && token && !done && !target && <Notice>We have not received a delivered study job yet. The questions appear when you download the delivery package from Studio using your study link. <Link href={`/research/me?p=${token}`} className="text-lp-accent underline underline-offset-2">Back to your study page</Link></Notice>}
      {view && token && !done && target && (target.closed
        ? <Notice kind="ok">You have already answered these for this job. <Link href={`/research/me?p=${token}`} className="text-lp-accent underline underline-offset-2">Back to your study page</Link></Notice>
        : <Card><ClosingForm token={token} job={target.key} formats={target.formats ?? undefined} onDone={setDone} /></Card>)}
      {done && token && (
        <Notice kind="ok">
          Thank you. {done.status === 'complete' ? <>That completes your part of the study. We have emailed you a link to confirm your payout details, or you can do it now: <Link href={`/research/payout?p=${token}`} className="text-lp-accent underline underline-offset-2">confirm payout details</Link>.</> : <>Your answers are saved. <Link href={`/research/me?p=${token}`} className="text-lp-accent underline underline-offset-2">See what is left on your study page</Link>.</>}
        </Notice>
      )}
      <StudyFooterLinks />
    </StudyFrame>
  )
}
