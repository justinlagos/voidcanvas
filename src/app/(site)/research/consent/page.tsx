'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button, Card, Loading, Notice, StudyFooterLinks, StudyFrame, Tick, useParticipant } from '@/components/research/ui'
import { DATES, studyCall, studyErrorText, type StudyView } from '@/lib/research'

const REQUIRED: [string, React.ReactNode][] = [
  ['read', <>I have read the <Link href="/research/information" target="_blank" className="text-lp-accent underline underline-offset-2">participant information sheet</Link> and the <Link href="/research/terms" target="_blank" className="text-lp-accent underline underline-offset-2">incentive terms</Link>.</>],
  ['age', 'I am 18 or over.'],
  ['voluntary', 'I understand that taking part is voluntary and that I can withdraw at any time without giving a reason.'],
  ['answers', <>I agree to my answers, in text and voice notes, being stored and analysed as described in the <Link href="/research/privacy" target="_blank" className="text-lp-accent underline underline-offset-2">privacy notice</Link>.</>],
  ['usage', 'I agree to timing and usage data being collected through my study link. I understand this does not include my designs, text, images or file names.'],
]
const OPTIONAL: [string, string][] = [
  ['recording', 'I agree to my Voidcanvas session being screen recorded during the study. I understand the recording may show client work, is seen only by the research team, and is deleted on ' + DATES.voiceDeleted + '.'],
  ['quotes', 'I agree to short quotes from my answers being used in the published findings, without my name or my clients’ names.'],
  ['future', 'I would like to hear about future Voidcanvas studies.'],
]

export default function ConsentPage() {
  const { token, view, error } = useParticipant()
  const [req, setReq] = useState<Record<string, boolean>>({})
  const [opt, setOpt] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState<string | null>(null)

  useEffect(() => { if (view && ['active', 'complete', 'paid'].includes(view.status) && token) location.replace(`/research/me?p=${token}`) }, [view, token])

  const allRequired = REQUIRED.every(([k]) => req[k])
  const join = async () => {
    if (!token || !allRequired) return
    setBusy(true); setFail(null)
    try {
      await studyCall<{ view: StudyView }>('consent', { token, required: req, optional: opt })
      location.assign(`/research/me?p=${token}&joined=1`)
    } catch (e) { setFail(studyErrorText(e)); setBusy(false) }
  }

  return (
    <StudyFrame eyebrow="Working Designer Study" title="Consent form" intro={view ? <>Taking part in the Voidcanvas Working Designer Study. Signing as <strong className="text-lp-fg">{view.firstName}</strong>, reference {view.ref}.</> : undefined}>
      {error && <Notice kind="error">{error}</Notice>}
      {!error && !view && <Loading />}
      {view && view.status === 'withdrawn' && <Notice>You have withdrawn from the study. If this is a mistake, email research@voidcanvas.app.</Notice>}
      {view && ['applied', 'not_selected'].includes(view.status) && <Notice>This consent form opens once you are selected. We reply to every applicant by {DATES.selection}.</Notice>}
      {view && view.status === 'selected' && (
        <Card>
          <h2 className="text-[17px] font-semibold text-lp-fg">Required</h2>
          <div className="mt-2 divide-y divide-[var(--lp-line)]">
            {REQUIRED.map(([k, t]) => <Tick key={k} id={`req-${k}`} required checked={!!req[k]} onChange={v => setReq({ ...req, [k]: v })}>{t}</Tick>)}
          </div>
          <h2 className="mt-8 text-[17px] font-semibold text-lp-fg">Optional</h2>
          <p className="text-[13.5px] text-lp-dim">You can take part fully without these.</p>
          <div className="mt-2 divide-y divide-[var(--lp-line)]">
            {OPTIONAL.map(([k, t]) => <Tick key={k} id={`opt-${k}`} checked={!!opt[k]} onChange={v => setOpt({ ...opt, [k]: v })}>{t}</Tick>)}
          </div>
          {fail && <div className="mt-6"><Notice kind="error">{fail}</Notice></div>}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button onClick={join} busy={busy} disabled={!allRequired}>Join the study</Button>
            {!allRequired && <span className="text-[13.5px] text-lp-dim">Tick the five required statements to continue.</span>}
          </div>
          <p className="mt-6 text-[13.5px] text-lp-dim">You can change your optional choices or withdraw at any time from your study page or by replying to any study email.</p>
        </Card>
      )}
      <StudyFooterLinks />
    </StudyFrame>
  )
}
