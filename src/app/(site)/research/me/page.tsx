'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Button, Card, Loading, Notice, StudyFooterLinks, StudyFrame, useParticipant } from '@/components/research/ui'
import { DATES, INCENTIVE, QUESTIONS, studyCall, studyErrorText } from '@/lib/research'

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 py-5">
      <span aria-hidden className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-[14px] font-semibold ${done ? 'bg-emerald-500/15 text-emerald-400' : 'bg-lp-panel text-lp-dim border border-lp-line'}`}>{done ? <Check size={16} /> : n}</span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[17px] font-semibold text-lp-fg">{title}<span className="sr-only">{done ? ' (done)' : ' (to do)'}</span></h2>
        <div className="mt-1.5 text-[15px] leading-relaxed text-lp-muted">{children}</div>
      </div>
    </li>
  )
}

export default function StudyHome() {
  const { token, view, error } = useParticipant()
  const [copied, setCopied] = useState(false)
  const [joined, setJoined] = useState(false)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [withdrawn, setWithdrawn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState<string | null>(null)

  useEffect(() => { setJoined(new URLSearchParams(location.search).get('joined') === '1') }, [])
  useEffect(() => { if (view?.status === 'selected' && token) location.replace(`/research/consent?p=${token}`) }, [view, token])

  const studioLink = token ? `https://voidcanvas.app/studio?study=${token}` : ''
  const answered = view ? QUESTIONS.filter(q => view.answers[q.id]?.text || view.answers[q.id]?.audio).length : 0
  const delivered = view?.jobs.find(j => j.delivered && (j.formats ?? 0) >= 3)
  const needsClosing = view?.jobs.find(j => j.delivered && !j.closed)
  const closed = view?.jobs.some(j => j.closed && (j.formats ?? 0) >= 3)

  const copy = async () => { try { await navigator.clipboard.writeText(studioLink); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ } }
  const withdraw = async () => {
    if (!token) return
    setBusy(true); setFail(null)
    try { await studyCall('withdraw', { token }); setWithdrawn(true) } catch (e) { setFail(studyErrorText(e)) } finally { setBusy(false) }
  }

  if (withdrawn || view?.status === 'withdrawn') return (
    <StudyFrame eyebrow="Working Designer Study" title="You have withdrawn">
      <Notice>You are no longer taking part. Your answers and recordings will be deleted within 30 days. Thank you for your time. If this was a mistake, email research@voidcanvas.app.</Notice>
    </StudyFrame>
  )

  return (
    <StudyFrame eyebrow="Working Designer Study" title={view ? `Your study page, ${view.firstName}` : 'Your study page'} intro={view ? <>Reference {view.ref}. Everything must be completed by {DATES.due}. Keep this page: the link in your emails always brings you back here.</> : undefined}>
      {error && <Notice kind="error">{error}</Notice>}
      {!error && !view && <Loading />}
      {view && ['applied', 'not_selected'].includes(view.status) && <Notice>Thank you for applying. We reply to every applicant by {DATES.selection}.</Notice>}
      {view && ['active', 'complete', 'paid'].includes(view.status) && (
        <>
          {joined && <div className="mb-6"><Notice kind="ok">You have joined the study. We have emailed you this link and the steps below.</Notice></div>}
          <Card>
            <ol className="divide-y divide-[var(--lp-line)] -my-5">
              <Step n={1} done title="Consent">Signed. Thank you.</Step>
              <Step n={2} done={view.interviewDone} title="Six questions about your last multi-format job">
                {view.interviewDone ? 'All six answered. You can still change your answers.' : `${answered} of 6 answered. About 15 minutes, by voice note or text. You can stop and come back.`}
                <div className="mt-3"><Link href={`/research/interview?p=${token}`} className="inline-flex items-center h-10 px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[14.5px] font-medium hover:bg-lp-btn-hover">{view.interviewDone ? 'Review answers' : answered ? 'Continue the questions' : 'Start the questions'}</Link></div>
              </Step>
              <Step n={3} done={!!delivered} title="One real client job in Voidcanvas Studio">
                {delivered ? `Delivered with ${delivered.formats} formats. Thank you.` : <>Between {DATES.jobWindow}, when a job with at least 3 formats comes in, open Studio with your study link and take it from key visual to delivery package. Use a laptop or desktop with Chrome or Edge.</>}
                {!delivered && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={studioLink} target="_blank" rel="noopener" className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-lp-btn text-lp-btn-fg text-[14.5px] font-medium hover:bg-lp-btn-hover">Open Studio with my study link<ExternalLink size={14} aria-hidden /></a>
                    <button onClick={copy} className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-lp-line text-[14.5px] text-lp-fg hover:border-lp-faint">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy link'}</button>
                  </div>
                )}
                {!delivered && <p className="mt-2 text-[13px] text-lp-dim">The link records timing and usage only. It never records your designs, text, images or file names.</p>}
              </Step>
              <Step n={4} done={!!closed} title="Three closing questions">
                {closed ? 'Answered.' : needsClosing ? <>Your job is delivered. Answer the three questions to finish. <Link href={`/research/closing?p=${token}&job=${encodeURIComponent(needsClosing.key)}`} className="text-lp-accent underline underline-offset-2">Answer now</Link></> : 'They appear when you download the delivery package from Studio.'}
              </Step>
              <Step n={5} done={view.status === 'paid'} title={`Your ${INCENTIVE}`}>
                {view.status === 'paid' ? 'Paid. The payment email has your reference.'
                  : view.status === 'complete' && view.payoutSubmitted ? `Payout details received. We pay within ${DATES.payWithin} and email you the reference.`
                    : view.status === 'complete' ? <>You have completed the study. <Link href={`/research/payout?p=${token}`} className="text-lp-accent underline underline-offset-2">Confirm your payout details</Link>.</>
                      : `Paid within ${DATES.payWithin} of confirming your payout details, once steps 1 to 4 are done.`}
              </Step>
            </ol>
          </Card>

          <p className="mt-6 text-[14px] text-lp-dim">Something not working? Use Help, then Report a problem, inside Voidcanvas, or email <a href="mailto:research@voidcanvas.app" className="text-lp-accent">research@voidcanvas.app</a>. Problems are useful to the study.</p>

          {view.status !== 'paid' && (
            <div className="mt-10 pt-6 border-t border-lp-line">
              {!confirmWithdraw ? (
                <button onClick={() => setConfirmWithdraw(true)} className="text-[14px] text-lp-dim underline underline-offset-2 hover:text-lp-fg">Withdraw from the study</button>
              ) : (
                <div className="space-y-3">
                  <p className="text-[14.5px] text-lp-text">Withdraw from the study? Your answers and recordings will be deleted within 30 days. The {INCENTIVE} is only paid for completing the study.</p>
                  {fail && <Notice kind="error">{fail}</Notice>}
                  <div className="flex gap-3"><Button variant="secondary" onClick={withdraw} busy={busy}>Yes, withdraw</Button><Button variant="secondary" onClick={() => setConfirmWithdraw(false)}>Keep taking part</Button></div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <StudyFooterLinks />
    </StudyFrame>
  )
}
