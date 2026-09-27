// Voidcanvas Working Designer Study: shared facts and the client for the study API (supabase/functions/research).
// Everything a participant sees about dates, money and questions comes from here, so the pages never disagree.

import { SUPABASE_KEY, SUPABASE_URL } from './analytics'

export const STUDY_API = `${SUPABASE_URL}/functions/v1/research`
export const STUDY_EMAIL = 'research@voidcanvas.app'
export const COMPANY = 'MotionPlay Labs Ltd'
export const COMPANY_LINE = 'MotionPlay Labs Ltd, registered in England and Wales (no. 17304660) and in Nigeria (RC 9621200)'
export const REGISTERED_OFFICE = '66 Paul Street, London, EC2A 4NA, United Kingdom'
export const PLACES = 20
export const INCENTIVE = '£15'

/** Dates are UK time. `closesAt` is the moment applications stop being accepted. */
export const DATES = {
  opens: '28 September 2026',
  closes: 'Sunday 4 October 2026',
  closesAt: '2026-10-04T23:59:59+01:00',
  selection: 'Monday 5 October',
  jobWindow: '6 to 20 October',
  jobStart: 'Tuesday 6 October',
  reminder: 'Tuesday 13 October',
  due: '23:59 UK time on Tuesday 20 October 2026',
  dueShort: '20 October',
  payWithin: '7 days',
  findings: 'Friday 6 November 2026',
  unclaimedReminder: '30 November 2026',
  unclaimedLapse: '31 December 2026',
  voiceDeleted: '18 January 2027',
  dataDeleted: '31 March 2027',
  foundingCloses: '30 November 2026',
  version: 'Version 1.1, 27 September 2026',
} as const

export const applicationsOpen = (now = new Date()) => now.getTime() <= new Date(DATES.closesAt).getTime()

export interface Question { id: string; title: string; prompt: string; hint: string }
export const QUESTIONS: Question[] = [
  { id: 'work', title: 'Your work', prompt: 'What kind of design work do you do, and who is it usually for?', hint: 'For example: event branding for corporate clients, social campaigns for restaurants, packaging for FMCG.' },
  { id: 'last_job', title: 'Your last multi-format job', prompt: 'Think of the last job where you delivered 4 or more formats. What was it, and which formats did you deliver?', hint: 'Name the sizes if you remember them: Instagram post, story, banner, flyer, billboard, email header.' },
  { id: 'steps', title: 'After the key visual was approved', prompt: 'The client approved the key visual. What happened next, step by step, and which tools did you use?', hint: 'Walk through it as it actually happened: resizing, checking, naming files, exporting, sending.' },
  { id: 'time', title: 'How long it took', prompt: 'How long did that part take, from approved key visual to files delivered?', hint: 'A rough number of hours is fine. Late nights, weekends or rushed deadlines are worth mentioning.' },
  { id: 'problems', title: 'What went wrong', prompt: 'What went wrong, or nearly went wrong, in that part of the job?', hint: 'Wrong sizes, file names, a missed format, extra revision rounds, delivery problems, client complaints.' },
  { id: 'fixes', title: 'What you have tried', prompt: 'What have you tried or paid for to make this part faster, and what do you pay for design tools now?', hint: 'Templates, plugins, Canva resize, Figma, a junior designer, anything. Include rough monthly costs if you can.' },
]

export const CLOSING_DISAPPOINTMENT: [string, string][] = [
  ['very', 'Very disappointed'], ['somewhat', 'Somewhat disappointed'], ['not', 'Not disappointed'],
]

export interface StudyView {
  ref: string; firstName: string; status: 'applied' | 'selected' | 'not_selected' | 'active' | 'complete' | 'paid' | 'withdrawn'
  qualified: boolean; inviteDeadline: string | null; consent: Record<string, boolean> | null
  interviewDone: boolean; jobStarted: boolean; completedAt: string | null; paidAt: string | null
  payoutSubmitted: boolean; payoutMethod: string | null
  answers: Record<string, { text: string; audio: boolean }>
  jobs: { key: string; started: string; delivered: string | null; formats: number | null; closed: boolean }[]
}

export class StudyError extends Error { constructor(public code: string, public status: number) { super(code) } }

export async function studyCall<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  let r: Response
  try {
    r = await fetch(STUDY_API, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY }, body: JSON.stringify({ action, ...body }) })
  } catch {
    throw new StudyError('network', 0)
  }
  const j = await r.json().catch(() => ({ ok: false, error: 'server' }))
  if (!r.ok || j.ok === false) throw new StudyError(j.error || 'server', r.status)
  return j as T
}

export const loadView = (token: string) => studyCall<{ view: StudyView }>('get', { token }).then(r => r.view)

/** The one line a participant sees when something fails. */
export function studyErrorText(e: unknown): string {
  const code = e instanceof StudyError ? e.code : 'server'
  switch (code) {
    case 'network': return 'We could not reach the study server. Check your connection and try again.'
    case 'not_found': return 'This study link is not recognised. Please use the link from your study email.'
    case 'duplicate': return 'An application with this email address already exists. We will be in touch at that address.'
    case 'email': return 'Please enter a valid email address.'
    case 'age': return 'You need to be 18 or over to take part.'
    case 'required': return 'Please tick all five required statements.'
    case 'not_selected': return 'This link is for selected participants. If you think this is a mistake, email research@voidcanvas.app.'
    case 'not_active': return 'This step opens once you have joined the study.'
    case 'bank': return 'Please check the account details. UK accounts have a 6 digit sort code and 8 digit account number; Nigerian accounts have a 10 digit NUBAN.'
    case 'audio_type': return 'Your browser recorded in a format we cannot store. Please type your answer instead.'
    case 'missing': case 'invalid': return 'Please fill in every required field.'
    default: return 'Something went wrong on our side. Please try again in a minute, or email research@voidcanvas.app.'
  }
}

// ---------- research mode in Studio ----------

const STUDY_KEY = 'vc-study'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The participant token for research mode: taken from ?study= on arrival, then remembered on this device. */
export function studyToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const q = new URLSearchParams(location.search).get('study')
    if (q && UUID.test(q)) { localStorage.setItem(STUDY_KEY, q); return q }
    const s = localStorage.getItem(STUDY_KEY)
    return s && UUID.test(s) ? s : null
  } catch { return null }
}
export function leaveStudyMode() { try { localStorage.removeItem(STUDY_KEY) } catch { /* ignore */ } }

/** Research-mode events. Only timing and counts: never designs, text, images or file names. */
export function studyEvent(name: 'study.open' | 'job.start' | 'job.formats' | 'job.deliver' | 'closing.shown', props: Record<string, string | number | boolean> = {}) {
  const token = studyToken()
  if (!token) return
  studyCall('event', { token, name, props }).catch(() => { /* research timing must never interrupt work */ })
}

// Active time on a job: counted only while the Studio tab is visible and the person has interacted in the last 5 minutes,
// so a laptop left open overnight does not inflate the number.
const IDLE_MS = 5 * 60 * 1000
const timers = new Map<string, { total: number; lastTick: number; lastInput: number }>()
let listening = false
function startListening() {
  if (listening || typeof window === 'undefined') return
  listening = true
  const bump = () => { const now = Date.now(); timers.forEach(t => { t.lastInput = now }) }
  ;['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(e => window.addEventListener(e, bump, { passive: true }))
  const save = () => {
    const now = Date.now()
    timers.forEach((t, key) => {
      if (document.visibilityState === 'visible' && now - t.lastInput < IDLE_MS) t.total += now - t.lastTick
      t.lastTick = now
      try { localStorage.setItem(`vc-study-time-${key}`, String(Math.round(t.total))) } catch { /* ignore */ }
    })
  }
  setInterval(save, 5000)
  // Moving between Studio and the Editor reloads the page, so save the count on the way out.
  window.addEventListener('pagehide', save)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save() })
}
export function startJobTimer(jobKey: string) {
  if (!studyToken()) return
  if (!timers.has(jobKey)) {
    let saved = 0
    try { saved = Number(localStorage.getItem(`vc-study-time-${jobKey}`)) || 0 } catch { /* ignore */ }
    timers.set(jobKey, { total: saved, lastTick: Date.now(), lastInput: Date.now() })
  }
  startListening()
}
export function jobActiveSeconds(jobKey: string): number {
  const t = timers.get(jobKey)
  if (t) return Math.round(t.total / 1000)
  try { return Math.round((Number(localStorage.getItem(`vc-study-time-${jobKey}`)) || 0) / 1000) } catch { return 0 }
}

const ACTIVE_JOB_KEY = 'vc-study-job'
/** Marks the Studio job being timed, so the timer carries on when the person moves between Studio and the Editor. */
export function setActiveStudyJob(jobKey: string) {
  if (!studyToken()) return
  try { localStorage.setItem(ACTIVE_JOB_KEY, jobKey) } catch { /* ignore */ }
  startJobTimer(jobKey)
}
export function activeStudyJob(): string | null { try { return localStorage.getItem(ACTIVE_JOB_KEY) } catch { return null } }
export function clearActiveStudyJob() { try { localStorage.removeItem(ACTIVE_JOB_KEY) } catch { /* ignore */ } }
