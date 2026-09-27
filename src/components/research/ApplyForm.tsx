'use client'

// The study application (screener). Qualification is worked out on the server and never shown here, so the form
// reads the same to everyone and nobody is steered towards the "right" answers.

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { DATES, applicationsOpen, studyCall, studyErrorText } from '@/lib/research'
import { Button, Choice, Notice, Tick, field, hint, label } from './ui'

const TOOLS = ['Photoshop', 'Illustrator', 'InDesign', 'Figma', 'Canva', 'Affinity', 'CorelDRAW', 'Photopea', 'Other']
const SOURCES: [string, string][] = [['linkedin', 'LinkedIn'], ['instagram', 'Instagram'], ['x', 'X'], ['whatsapp', 'WhatsApp'], ['friend', 'A friend or colleague'], ['email', 'An email from Voidcanvas'], ['other', 'Somewhere else']]

export function ApplyForm() {
  const id = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState<'UK' | 'Nigeria' | 'Other' | ''>('')
  const [role, setRole] = useState<'freelancer' | 'studio' | 'agency_lead' | 'in_house' | 'student' | 'other' | ''>('')
  const [studioSize, setStudioSize] = useState('')
  const [multi, setMulti] = useState<'yes' | 'no' | ''>('')
  const [adapted, setAdapted] = useState<'me' | 'junior' | 'someone_else' | ''>('')
  const [perMonth, setPerMonth] = useState('')
  const [tools, setTools] = useState<string[]>([])
  const [workType, setWorkType] = useState('')
  const [heard, setHeard] = useState('')
  const [over18, setOver18] = useState(false)
  const [website, setWebsite] = useState('')
  const [src, setSrc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ref, setRef] = useState<string | null>(null)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    setOpen(applicationsOpen())
    const q = new URLSearchParams(location.search)
    setSrc((q.get('src') || q.get('utm_source') || '').slice(0, 40))
  }, [])

  const complete = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && country && role && multi && adapted && over18
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!complete) { setError('Please answer every question marked as required.'); return }
    setBusy(true)
    try {
      const r = await studyCall<{ ref: string | null }>('apply', {
        name, email, country, role, studioSize: role === 'studio' ? studioSize : '', multiFormatJob: multi === 'yes', adaptedBy: adapted, jobsPerMonth: perMonth,
        tools, workType, source: [src, heard].filter(Boolean).join(':'), over18, website,
      })
      setRef(r.ref || 'received')
    } catch (err) {
      setError(studyErrorText(err))
    } finally { setBusy(false) }
  }

  if (!open) return <Notice>Applications for this round closed on {DATES.closes}. Thank you for your interest. If you would like to hear about future studies, email <a className="text-lp-accent" href="mailto:research@voidcanvas.app">research@voidcanvas.app</a>.</Notice>

  if (ref) return (
    <div className="text-center py-6" role="status">
      <CheckCircle2 size={40} className="mx-auto text-emerald-400" aria-hidden />
      <h3 className="mt-4 text-[24px] font-semibold tracking-tight text-lp-fg">Application received</h3>
      {ref !== 'received' && <p className="mt-2 text-[15px] text-lp-dim">Your reference is <strong className="text-lp-fg">{ref}</strong>.</p>}
      <p className="mt-3 text-[16px] text-lp-muted max-w-[520px] mx-auto">We have sent a confirmation to {email}. We review every application and reply to everyone by {DATES.selection}, whether or not you are selected.</p>
      <p className="mt-3 text-[14px] text-lp-dim">If the email does not arrive within a few minutes, check your spam or promotions folder and mark research@voidcanvas.app as a safe sender.</p>
    </div>
  )

  return (
    <form onSubmit={submit} noValidate className="space-y-7">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor={`${id}-name`} className={label}>Full name</label>
          <input id={`${id}-name`} value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={120} required className={`${field} mt-2 h-11`} />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className={label}>Email</label>
          <input id={`${id}-email`} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={200} required className={`${field} mt-2 h-11`} />
        </div>
      </div>

      <fieldset>
        <legend className={label}>Where are you based?</legend>
        <Choice name={`${id}-country`} value={country} onChange={setCountry} columns={3} options={[['UK', 'United Kingdom'], ['Nigeria', 'Nigeria'], ['Other', 'Somewhere else']]} />
      </fieldset>

      <fieldset>
        <legend className={label}>Which best describes your work?</legend>
        <Choice name={`${id}-role`} value={role} onChange={setRole} columns={2} options={[
          ['freelancer', 'Freelance designer'], ['studio', 'I run or work in a studio of 1 to 10 people'], ['agency_lead', 'I lead design at a small agency'],
          ['in_house', 'In-house designer at a brand or company'], ['student', 'Student'], ['other', 'Something else'],
        ]} />
        {role === 'studio' && (
          <div className="mt-3">
            <label htmlFor={`${id}-size`} className="text-[14px] text-lp-dim">How many people in the studio? (optional)</label>
            <select id={`${id}-size`} value={studioSize} onChange={e => setStudioSize(e.target.value)} className={`${field} mt-1 h-11`}>
              <option value="">Choose</option><option value="1">Just me</option><option value="2-5">2 to 5</option><option value="6-10">6 to 10</option>
            </select>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className={label}>In the last 30 days, did you deliver a job with 4 or more formats?</legend>
        <p className={hint}>For example one campaign delivered as a post, a story, a banner and a flyer.</p>
        <Choice name={`${id}-multi`} value={multi} onChange={setMulti} columns={2} options={[['yes', 'Yes'], ['no', 'No']]} />
      </fieldset>

      <fieldset>
        <legend className={label}>On that kind of job, who adapts the design into each format?</legend>
        <Choice name={`${id}-adapted`} value={adapted} onChange={setAdapted} options={[['me', 'I do it myself'], ['junior', 'A junior or colleague does it'], ['someone_else', 'Someone else, such as a production team or printer']]} />
      </fieldset>

      <div>
        <label htmlFor={`${id}-month`} className={label}>How many multi-format jobs do you deliver in a typical month? <span className="font-normal text-lp-dim">(optional)</span></label>
        <select id={`${id}-month`} value={perMonth} onChange={e => setPerMonth(e.target.value)} className={`${field} mt-2 h-11`}>
          <option value="">Choose</option><option value="1">About 1</option><option value="2-4">2 to 4</option><option value="5-10">5 to 10</option><option value="10+">More than 10</option>
        </select>
      </div>

      <fieldset>
        <legend className={label}>Which tools do you use for this work? <span className="font-normal text-lp-dim">(optional, choose any)</span></legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOOLS.map(t => {
            const on = tools.includes(t)
            return <button key={t} type="button" aria-pressed={on} onClick={() => setTools(on ? tools.filter(x => x !== t) : [...tools, t])} className={`h-9 px-3.5 rounded-full border text-[14px] transition-colors ${on ? 'border-lp-accent bg-lp-panel text-lp-fg' : 'border-lp-line text-lp-dim hover:border-lp-faint'}`}>{t}</button>
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-work`} className={label}>In a sentence, what kind of work do you do? <span className="font-normal text-lp-dim">(optional)</span></label>
        <input id={`${id}-work`} value={workType} onChange={e => setWorkType(e.target.value)} maxLength={400} placeholder="Event branding for corporate clients, restaurant social campaigns…" className={`${field} mt-2 h-11`} />
      </div>

      <div>
        <label htmlFor={`${id}-heard`} className={label}>Where did you hear about the study? <span className="font-normal text-lp-dim">(optional)</span></label>
        <select id={`${id}-heard`} value={heard} onChange={e => setHeard(e.target.value)} className={`${field} mt-2 h-11`}>
          <option value="">Choose</option>{SOURCES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </div>

      {/* Left empty by people; bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
      </div>

      <div className="rounded-2xl border border-lp-line px-4 py-2">
        <Tick id={`${id}-age`} checked={over18} onChange={setOver18} required>I am 18 or over.</Tick>
      </div>

      <p className="text-[13.5px] leading-relaxed text-lp-dim">Applying does not commit you to anything. We store your answers to select participants and contact you about this study, as set out in the <Link href="/research/privacy" className="text-lp-accent hover:text-lp-fg">privacy notice</Link>. There is nothing to buy, now or later.</p>

      {error && <Notice kind="error">{error}</Notice>}
      <Button type="submit" busy={busy} disabled={!complete}>Send application</Button>
    </form>
  )
}
