'use client'

import Link from 'next/link'
import { useId, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button, Card, Choice, Loading, Notice, StudyFooterLinks, StudyFrame, field, label, useParticipant } from '@/components/research/ui'
import { DATES, INCENTIVE, studyCall, studyErrorText, type StudyView } from '@/lib/research'

type Method = 'uk_bank' | 'ng_bank' | 'paypal'

export default function PayoutPage() {
  const id = useId()
  const { token, view, setView, error } = useParticipant()
  const [method, setMethod] = useState<Method | ''>('')
  const [d, setD] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !method) return
    setBusy(true); setErr(null)
    try {
      const r = await studyCall<{ view: StudyView }>('payout', { token, method, details: d })
      setView(r.view); setDone(true); setMethod(''); setD({})
    } catch (e2) { setErr(studyErrorText(e2)) } finally { setBusy(false) }
  }

  const input = (k: string, l: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`${id}-${k}`} className={label}>{l}</label>
      <input id={`${id}-${k}`} value={d[k] || ''} onChange={set(k)} className={`${field} mt-2 h-11`} {...props} />
    </div>
  )

  return (
    <StudyFrame eyebrow="Working Designer Study" title={`Receive your ${INCENTIVE}`} intro="Tell us where to send your payment. We pay within 7 days and email you the payment reference.">
      {error && <Notice kind="error">{error}</Notice>}
      {!error && !view && <Loading />}
      {view && view.status === 'paid' && <Notice kind="ok">You have been paid. The payment email has your reference. Thank you for taking part.</Notice>}
      {view && ['active', 'selected', 'applied'].includes(view.status) && <Notice>This page opens once you have completed all the study steps. <Link href={`/research/me?p=${token}`} className="text-lp-accent underline underline-offset-2">See what is left</Link></Notice>}
      {view && view.status === 'complete' && (done || view.payoutSubmitted) && !method && (
        <Notice kind="ok">We have your payout details{view.payoutMethod ? ` (${view.payoutMethod === 'paypal' ? 'PayPal' : view.payoutMethod === 'uk_bank' ? 'UK bank transfer' : 'Nigerian bank transfer'})` : ''}. We pay within {DATES.payWithin} and email you the reference. To change them, choose a method below.</Notice>
      )}
      {view && view.status === 'complete' && (
        <Card className="mt-6">
          <form onSubmit={submit} className="space-y-6">
            <fieldset>
              <legend className={label}>How would you like to be paid?</legend>
              <Choice name={`${id}-m`} value={method} onChange={v => { setMethod(v); setD({}) }} options={[
                ['uk_bank', 'UK bank transfer', 'In pounds, to a UK account'],
                ['ng_bank', 'Nigerian bank transfer', 'In naira, at Wise’s rate on the day we pay'],
                ['paypal', 'PayPal', 'In pounds, to your PayPal email'],
              ]} />
            </fieldset>
            {method === 'uk_bank' && <div className="grid sm:grid-cols-2 gap-5">{input('name', 'Name on the account', { autoComplete: 'name' })}{input('sortCode', 'Sort code', { inputMode: 'numeric', placeholder: '12-34-56', maxLength: 8 })}{input('account', 'Account number', { inputMode: 'numeric', maxLength: 8 })}</div>}
            {method === 'ng_bank' && <div className="grid sm:grid-cols-2 gap-5">{input('name', 'Name on the account', { autoComplete: 'name' })}{input('bank', 'Bank', { placeholder: 'For example GTBank, Access, Zenith' })}{input('account', 'Account number (NUBAN, 10 digits)', { inputMode: 'numeric', maxLength: 10 })}</div>}
            {method === 'paypal' && <div className="max-w-[420px]">{input('email', 'PayPal email', { type: 'email', autoComplete: 'email' })}</div>}
            {method && (
              <div className="flex items-start gap-3 rounded-xl border border-lp-line px-4 py-3 text-[14px] leading-relaxed text-lp-muted">
                <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                <p>We only need what is above to send you money. We never ask for passwords, card numbers, PINs or one-time codes, and we will never ask you to pay anything to receive this payment. These details are deleted 30 days after we pay you.</p>
              </div>
            )}
            {err && <Notice kind="error">{err}</Notice>}
            {method && <Button type="submit" busy={busy}>Save payout details</Button>}
          </form>
        </Card>
      )}
      <StudyFooterLinks />
    </StudyFrame>
  )
}
