// Voidcanvas Working Designer Study: the one API behind the study pages, research mode in Studio and the admin view.
// Participant data lives in the private `research` schema. This function reaches it only through a fixed set of
// database functions (public.research_*) that only the service role may call, so nothing about participants is
// readable through the public API. Each participant is identified by a secret token that only appears in their own
// study links. MailerLite is kept in step on every change: joining a group starts that step's study email
// (see docs/plans/working-designer-study.md).

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
const storage = sb.storage.from('research-voice')
// The MailerLite token for the Voidcanvas account. It was first saved under the name `voidcanvas`; either name works.
const ML_KEY = Deno.env.get('MAILERLITE_API_KEY') || Deno.env.get('voidcanvas') || ''
const ML = 'https://connect.mailerlite.com/api'

const ORIGINS = ['https://voidcanvas.app', 'https://www.voidcanvas.app', 'https://voidcanvas.netlify.app', 'http://localhost:3123', 'http://localhost:3000']
function cors(req: Request) {
  const o = req.headers.get('origin') || ''
  const ok = ORIGINS.includes(o) || /^https:\/\/[a-z0-9-]+--voidcanvas\.netlify\.app$/.test(o)
  return { 'Access-Control-Allow-Origin': ok ? o : ORIGINS[0], 'Access-Control-Allow-Headers': 'content-type, apikey, authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' }
}

class Fail extends Error { constructor(public code: string, public status = 400) { super(code) } }

// deno-lint-ignore no-explicit-any
type P = Record<string, any>
async function rpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb.rpc(fn, args)
  if (error) throw new Error(`${fn}: ${error.message}`)
  return data as T
}

// ---------- the study's fixed facts ----------

const QUESTIONS = ['work', 'last_job', 'steps', 'time', 'problems', 'fixes']
const GROUPS = {
  applied: 'Study: applied', selected: 'Study: selected', not_selected: 'Study: not selected', active: 'Study: active',
  complete: 'Study: complete', paid: 'Study: paid', future: 'Future studies',
} as const
type Group = keyof typeof GROUPS
const FIELDS = ['study_token', 'study_ref', 'study_country', 'invite_deadline', 'job_started', 'interview_done', 'payout_amount', 'payout_method', 'payment_date', 'payment_ref', 'check_date']
const COUNTRIES = ['UK', 'Nigeria', 'Other']
const ROLES = ['freelancer', 'studio', 'agency_lead', 'in_house', 'student', 'other']
const QUALIFYING_ROLES = ['freelancer', 'studio', 'agency_lead']
const ADAPTED = ['me', 'junior', 'someone_else']
const EVENT_NAMES = new Set(['study.open', 'job.start', 'job.formats', 'job.deliver', 'closing.shown', 'problem.report'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const str = (v: unknown, max: number, min = 0) => {
  if (typeof v !== 'string') { if (min) throw new Fail('missing'); return '' }
  const s = v.trim()
  if (s.length < min) throw new Fail('missing')
  return s.slice(0, max)
}
const oneOf = (v: unknown, list: string[]) => { if (typeof v !== 'string' || !list.includes(v)) throw new Fail('invalid'); return v }
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
const longDate = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' })
const fullDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' })
function addWorkingDays(d: Date, n: number) { const x = new Date(d); while (n > 0) { x.setDate(x.getDate() + 1); const w = x.getDay(); if (w !== 0 && w !== 6) n-- } return x }

// ---------- MailerLite ----------

let groupIds: Record<string, string> | null = null
let fieldsReady = false
async function ml(path: string, init: RequestInit = {}) {
  const r = await fetch(`${ML}${path}`, { ...init, signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${ML_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' } })
  if (r.status === 204) return null
  const j = await r.json().catch(() => null)
  if (!r.ok) throw new Error(`MailerLite ${path} ${r.status}: ${JSON.stringify(j).slice(0, 300)}`)
  return j
}
async function ensureSetup() {
  if (!fieldsReady) {
    const have = new Set(((await ml('/fields?limit=100'))?.data || []).map((f: P) => f.key))
    for (const k of FIELDS) if (!have.has(k)) await ml('/fields', { method: 'POST', body: JSON.stringify({ name: k, type: 'text' }) })
    fieldsReady = true
  }
  if (!groupIds) {
    const ids: Record<string, string> = {}
    const all = (await ml('/groups?limit=100'))?.data || []
    for (const name of Object.values(GROUPS)) {
      const g = all.find((x: P) => x.name === name) || (await ml('/groups', { method: 'POST', body: JSON.stringify({ name }) }))?.data
      ids[name] = String(g.id)
    }
    groupIds = ids
  }
  return groupIds
}
function mlFields(p: P, extra: Record<string, string> = {}) {
  const parts = String(p.name).trim().split(/\s+/)
  return {
    name: parts[0], last_name: parts.slice(1).join(' '),
    study_token: p.token, study_ref: p.ref, study_country: p.country,
    invite_deadline: p.invite_deadline ? longDate(new Date(p.invite_deadline)) : '',
    job_started: p.job_started ? 'yes' : 'no', interview_done: p.interview_done ? 'yes' : 'no',
    ...extra,
  }
}
const log = (id: string, name: string, props: Record<string, unknown> = {}) => rpc('research_log', { p_id: id, p_name: name, p_props: props })

/** Push a participant's details to MailerLite and add them to a group. Joining the group starts that step's email. */
async function syncMl(p: P, group?: Group, extra: Record<string, string> = {}) {
  // Automated tests use @test.voidcanvas.app addresses; they never reach MailerLite, so no real email is sent.
  if (!ML_KEY || /@test\.voidcanvas\.app$/i.test(p.email)) { await log(p.id, 'ml.skipped', { group: group || null }); return }
  try {
    const ids = await ensureSetup()
    const body: Record<string, unknown> = { email: p.email, fields: mlFields(p, extra) }
    if (group) body.groups = [ids[GROUPS[group]]]
    const r = await ml('/subscribers', { method: 'POST', body: JSON.stringify(body) })
    const sid = r?.data?.id ? String(r.data.id) : null
    if (sid && sid !== p.ml_subscriber_id) await rpc('research_set_ml', { p_id: p.id, p_sid: sid })
  } catch (e) {
    await log(p.id, 'ml.error', { group: group || null, msg: String(e).slice(0, 300) })
  }
}

// ---------- participant helpers ----------

async function byToken(token: unknown): Promise<P> {
  if (typeof token !== 'string' || !UUID.test(token)) throw new Fail('not_found', 404)
  const p = await rpc<P | null>('research_by_token', { p_token: token })
  if (!p) throw new Fail('not_found', 404)
  return p
}
const update = (p: P, patch: Record<string, unknown>) => rpc<P>('research_update', { p_id: p.id, p: patch })

async function view(p: P) {
  const v = await rpc<P>('research_view', { p_id: p.id })
  return {
    ref: p.ref, firstName: String(p.name).trim().split(/\s+/)[0], status: p.status, qualified: p.qualified,
    inviteDeadline: p.invite_deadline, consent: p.consent, interviewDone: p.interview_done, jobStarted: p.job_started,
    completedAt: p.completed_at, paidAt: p.paid_at, payoutSubmitted: !!v.payout_method, payoutMethod: v.payout_method || null,
    answers: Object.fromEntries((v.answers || []).map((a: P) => [a.question, { text: a.body || '', audio: !!a.audio }])),
    jobs: v.jobs || [],
  }
}
/** Completed = consent, all six answers, and one real job delivered with 3+ formats and its closing questions answered. */
async function maybeComplete(p: P) {
  if (p.status !== 'active' || !p.interview_done) return p
  if (!(await rpc<boolean>('research_has_finished_job', { p_id: p.id }))) return p
  const q = await update(p, { status: 'complete' })
  await log(p.id, 'status.complete')
  await syncMl(q, 'complete')
  return q
}
function mustBeIn(p: P, statuses: string[]) { if (!statuses.includes(p.status)) throw new Fail('not_active', 403) }

// ---------- public actions ----------

async function apply(b: P) {
  if (b.website) return { ok: true, ref: null } // honeypot for bots
  const name = str(b.name, 120, 2)
  const email = str(b.email, 200, 3).toLowerCase()
  if (!isEmail(email)) throw new Fail('email')
  const country = oneOf(b.country, COUNTRIES)
  const role = oneOf(b.role, ROLES)
  const multi = b.multiFormatJob === true
  const adapted_by = oneOf(b.adaptedBy, ADAPTED)
  if (b.over18 !== true) throw new Fail('age')
  const tools = Array.isArray(b.tools) ? b.tools.filter((t: unknown) => typeof t === 'string').map((t: string) => t.slice(0, 40)).slice(0, 12) : []
  const qualified = country !== 'Other' && QUALIFYING_ROLES.includes(role) && multi && adapted_by === 'me'
  const p = await rpc<P>('research_apply', { p: {
    name, email, country, role, studio_size: str(b.studioSize, 40), multi, jobs_per_month: str(b.jobsPerMonth, 20), adapted_by, tools,
    work_type: str(b.workType, 400), source: str(b.source, 80), over18: true, qualified,
  } })
  if (p.error === 'duplicate') throw new Fail('duplicate', 409)
  await log(p.id, 'status.applied', { qualified, source: p.source })
  await syncMl(p, 'applied')
  return { ok: true, ref: p.ref }
}

async function consent(b: P) {
  const p = await byToken(b.token)
  if (['active', 'complete', 'paid'].includes(p.status)) return { ok: true, view: await view(p) }
  if (p.status !== 'selected') throw new Fail('not_selected', 403)
  if (!['read', 'age', 'voluntary', 'answers', 'usage'].every(k => b.required?.[k] === true)) throw new Fail('required')
  const c = { read: true, age: true, voluntary: true, answers: true, usage: true, recording: b.optional?.recording === true, quotes: b.optional?.quotes === true, future: b.optional?.future === true, version: '1.0' }
  const q = await update(p, { status: 'active', consent: c })
  await log(p.id, 'status.active', { recording: c.recording, quotes: c.quotes })
  await syncMl(q, 'active')
  if (c.future) await syncMl(q, 'future')
  return { ok: true, view: await view(q) }
}

async function answer(b: P) {
  let p = await byToken(b.token)
  mustBeIn(p, ['active', 'complete'])
  const question = oneOf(b.question, QUESTIONS)
  const body = str(b.text, 8000)
  const audio = typeof b.audioPath === 'string' && b.audioPath.startsWith(`${p.id}/`) ? b.audioPath.slice(0, 300) : null
  const secs = Number.isFinite(b.audioSeconds) ? Math.max(0, Math.min(3600, Math.round(b.audioSeconds))) : null
  const n = await rpc<number>('research_answer', { p_id: p.id, p_question: question, p_body: body, p_audio: audio, p_secs: secs })
  const done = n >= QUESTIONS.length
  if (done !== p.interview_done) {
    p = await update(p, { interview_done: done })
    if (done) { await log(p.id, 'interview.done'); await syncMl(p) }
  }
  p = await maybeComplete(p)
  return { ok: true, view: await view(p) }
}

async function voiceUrl(b: P) {
  const p = await byToken(b.token)
  mustBeIn(p, ['active', 'complete'])
  const question = oneOf(b.question, QUESTIONS)
  const mime = typeof b.mime === 'string' ? b.mime.split(';')[0] : 'audio/webm'
  const ext = ({ 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac' } as Record<string, string>)[mime]
  if (!ext) throw new Fail('audio_type')
  const path = `${p.id}/${question}-${Date.now()}.${ext}`
  const { data, error } = await storage.createSignedUploadUrl(path)
  if (error || !data) throw new Error(error?.message || 'upload url')
  return { ok: true, path, url: data.signedUrl }
}

async function event(b: P) {
  let p = await byToken(b.token)
  if (!['active', 'complete', 'paid'].includes(p.status)) return { ok: true, ignored: true }
  const name = String(b.name || '')
  if (!EVENT_NAMES.has(name)) throw new Fail('event')
  const props: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(b.props || {}).slice(0, 12)) if (['string', 'number', 'boolean'].includes(typeof v)) props[k.slice(0, 32)] = typeof v === 'string' ? (v as string).slice(0, 160) : v
  await log(p.id, name, props)
  const job = typeof props.job === 'string' ? (props.job as string).slice(0, 80) : ''
  if (job && ['job.start', 'job.formats', 'job.deliver'].includes(name)) {
    const deliver = name === 'job.deliver'
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null)
    await rpc('research_job', { p_id: p.id, p_job: job, p_deliver: deliver, p_formats: deliver ? num(props.formats) : null, p_active: deliver ? num(props.activeSeconds) : null })
    if (!p.job_started) { p = await update(p, { job_started: true }); await syncMl(p) }
  }
  return { ok: true }
}

async function closing(b: P) {
  let p = await byToken(b.token)
  mustBeIn(p, ['active', 'complete', 'paid'])
  const job = str(b.job, 80, 1)
  const usual = Number(b.usualMinutes)
  if (!Number.isFinite(usual) || usual <= 0 || usual > 60 * 24 * 14) throw new Fail('usual')
  const dis = oneOf(b.disappointment, ['very', 'somewhat', 'not'])
  const found = await rpc<boolean>('research_closing', { p_id: p.id, p_job: job, p_usual: Math.round(usual), p_blocked: str(b.blocked, 4000), p_dis: dis })
  if (!found) throw new Fail('job', 404)
  await log(p.id, 'closing.done', { job })
  p = await maybeComplete(p)
  return { ok: true, view: await view(p) }
}

async function payout(b: P) {
  const p = await byToken(b.token)
  mustBeIn(p, ['complete'])
  const method = oneOf(b.method, ['uk_bank', 'ng_bank', 'paypal'])
  const d = b.details || {}
  let details: Record<string, string>
  if (method === 'paypal') {
    const email = str(d.email, 200, 3); if (!isEmail(email)) throw new Fail('email'); details = { email }
  } else if (method === 'uk_bank') {
    details = { name: str(d.name, 120, 2), sortCode: str(d.sortCode, 12, 6).replace(/\D/g, ''), account: str(d.account, 12, 8).replace(/\D/g, '') }
    if (details.sortCode.length !== 6 || details.account.length !== 8) throw new Fail('bank')
  } else {
    details = { name: str(d.name, 120, 2), bank: str(d.bank, 80, 2), account: str(d.account, 14, 10).replace(/\D/g, '') }
    if (details.account.length !== 10) throw new Fail('bank')
  }
  await rpc('research_payout', { p_id: p.id, p_method: method, p_details: details })
  await log(p.id, 'payout.submitted', { method })
  return { ok: true, view: await view(p) }
}

async function future(b: P) {
  const p = await byToken(b.token)
  const q = await update(p, { consent: { ...(p.consent || {}), future: true } })
  await log(p.id, 'future.optin')
  await syncMl(q, 'future')
  return { ok: true }
}

async function withdraw(b: P) {
  const p = await byToken(b.token)
  if (p.status === 'paid') throw new Fail('paid')
  await update(p, { status: 'withdrawn' })
  await log(p.id, 'status.withdrawn', { by: 'participant' })
  return { ok: true }
}

// ---------- admin ----------

async function admin(b: P) {
  if (!(await rpc<boolean>('vc_research_admin_ok', { p_password: String(b.password || '') }))) throw new Fail('password', 401)
  const op = String(b.op || 'list')
  if (op === 'list') return { ok: true, mailerlite: !!ML_KEY, ...(await rpc<P>('research_admin_list')) }
  if (op === 'audio') {
    const { data, error } = await storage.createSignedUrl(str(b.path, 300, 5), 600)
    if (error || !data) throw new Error(error?.message || 'audio')
    return { ok: true, url: data.signedUrl }
  }
  const ids: string[] = Array.isArray(b.ids) ? b.ids.filter((x: unknown) => typeof x === 'string' && UUID.test(x)) : []
  const rows = async (only?: string[]) => rpc<P[]>('research_admin_rows', { p_ids: only ?? null })
  if (op === 'select' || op === 'not_select') {
    const status = op === 'select' ? 'selected' : 'not_selected'
    let changed = 0
    for (const p of await rows(ids)) {
      if (!['applied', 'selected', 'not_selected'].includes(p.status)) continue
      const deadline = op === 'select' ? new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) : null
      const q = await update(p, { status, invite_deadline: deadline })
      await log(p.id, `status.${status}`, { by: 'admin' })
      await syncMl(q, status)
      changed++
    }
    return { ok: true, changed }
  }
  if (op === 'mark_paid') {
    const [p] = await rows([str(b.id, 40, 36)])
    if (!p || p.status !== 'complete') throw new Fail('not_complete')
    const now = new Date()
    const amount = str(b.amount, 40, 1), method = str(b.method, 60, 1), ref = str(b.ref, 80, 1)
    const q = await update(p, { status: 'paid', payment_ref: ref, payout_amount: amount, payout_method: method })
    await log(p.id, 'status.paid', { amount, method })
    await syncMl(q, 'paid', { payout_amount: amount, payout_method: method, payment_date: fullDate(now), payment_ref: ref, check_date: fullDate(addWorkingDays(now, 3)) })
    return { ok: true }
  }
  if (op === 'withdraw') {
    for (const p of await rows(ids)) if (p.status !== 'paid') { await update(p, { status: 'withdrawn' }); await log(p.id, 'status.withdrawn', { by: 'admin' }) }
    return { ok: true }
  }
  if (op === 'note') {
    const [p] = await rows([str(b.id, 40, 36)])
    if (p) await update(p, { notes: str(b.note, 2000) })
    return { ok: true }
  }
  if (op === 'delete') {
    // On withdrawal: answers, recordings and events go. Paid people's records are kept for accounting, so they stay.
    let deleted = 0
    for (const p of await rows(ids)) {
      if (p.status === 'paid') continue
      const files = (await storage.list(p.id)).data || []
      if (files.length) await storage.remove(files.map(f => `${p.id}/${f.name}`))
      await rpc('research_admin_delete', { p_id: p.id })
      deleted++
    }
    return { ok: true, deleted }
  }
  if (op === 'resync') {
    let synced = 0
    for (const p of await rows()) {
      if (p.status === 'withdrawn') continue
      await syncMl(p, p.status as Group); synced++
    }
    return { ok: true, synced }
  }
  throw new Fail('op')
}

const ACTIONS: Record<string, (b: P) => Promise<unknown>> = {
  apply, consent, answer, 'voice-url': voiceUrl, event, closing, payout, future, withdraw, admin,
  get: async (b: P) => ({ ok: true, view: await view(await byToken(b.token)) }),
}

Deno.serve(async (req) => {
  const h = cors(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: h })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: h })
  try {
    const b = await req.json()
    const fn = ACTIONS[String(b?.action)]
    if (!fn) throw new Fail('action')
    return Response.json(await fn(b), { headers: h })
  } catch (e) {
    if (e instanceof Fail) return Response.json({ ok: false, error: e.code }, { status: e.status, headers: h })
    console.error(e)
    return Response.json({ ok: false, error: 'server' }, { status: 500, headers: h })
  }
})
