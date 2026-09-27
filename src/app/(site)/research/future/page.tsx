'use client'

import { useState } from 'react'
import { Button, Card, Loading, Notice, StudyFrame, useParticipant } from '@/components/research/ui'
import { studyCall, studyErrorText } from '@/lib/research'

export default function FuturePage() {
  const { token, view, error } = useParticipant()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const optIn = async () => {
    if (!token) return
    setBusy(true); setErr(null)
    try { await studyCall('future', { token }); setDone(true) } catch (e) { setErr(studyErrorText(e)) } finally { setBusy(false) }
  }
  return (
    <StudyFrame eyebrow="Voidcanvas research" title="Future studies">
      {error && <Notice kind="error">{error}</Notice>}
      {!error && !view && <Loading />}
      {view && (done || view.consent?.future
        ? <Notice kind="ok">Thank you, {view.firstName}. We will email you when the next Voidcanvas study opens. You can ask to be removed at any time by replying to that email.</Notice>
        : <Card>
            <p className="text-[16px] leading-relaxed text-lp-text">We run a small number of paid studies with working designers. Would you like an email when the next one opens? We will not use your address for anything else.</p>
            {err && <div className="mt-4"><Notice kind="error">{err}</Notice></div>}
            <div className="mt-6"><Button onClick={optIn} busy={busy}>Yes, tell me about future studies</Button></div>
          </Card>)}
    </StudyFrame>
  )
}
