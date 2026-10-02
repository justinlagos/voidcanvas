// Anonymous usage counts and feedback.
// What is sent: event names (for example "export"), small settings (file type, tool id, the name of a panel control),
// page area, device type, browser, time zone, screen size, the app version, and a random id for this browser. Counts
// of what happened in a session: minutes of active work, undo steps by kind (text, move, colour...), saves, exports
// and slow moments. The words typed into the Editor's command search when nothing matches (first 32 characters,
// dropped if they hold an @ or a run of digits). Never images, file names, layer names, text or design content.
// Off in a private session, when Do Not Track or Global Privacy Control is on, in automated browsers, and when the
// person turns it off. Nothing is sent from a visit until the person moves the pointer, taps or presses a key, so
// pages loaded by crawlers are never counted.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_VC_SUPABASE_URL || 'https://fpmyuqjiwckcjaufwwit.supabase.co'
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_VC_SUPABASE_KEY || 'sb_publishable_c2MeeGrEJLlIwDf6xXzSMg_pk4aGyAv'
/** The app version (desktop/package.json), so a change can be compared before and after. */
export const APP_VERSION = (process.env.NEXT_PUBLIC_APP_VERSION || 'dev').toLowerCase().replace(/[^0-9a-z.+-]/g, '').slice(0, 24) || 'dev'
const APP = process.env.NEXT_PUBLIC_DESKTOP ? 'desktop' : 'web'

const OFF_KEY = 'vc-usage-off'
const DEVICE_KEY = 'vc-device'
const SESSION_KEY = 'vc-session'
/** Set on the team's own devices from /admin. Their events are kept apart from designers'. */
const INTERNAL_KEY = 'vc-internal'
/** Lets the analytics e2e check run in an automated browser. Nothing else sets it. */
const TEST_KEY = 'vc-usage-test'
/** Set for the tab once a person has used the pointer, touch or keyboard. */
const HUMAN_KEY = 'vc-human'
const SESSION_IDLE_MS = 30 * 60 * 1000
const MAX_PER_SESSION = 600
const MAX_HELD = 60
const FLUSH_MS = 3000
const SUMMARY_MS = 5 * 60 * 1000
/** Time with input in the last 30 seconds counts as active work. */
export const ENGAGED_GAP_MS = 30 * 1000
const URGENT = new Set(['session.start', 'export', 'export.failed', 'error', 'feedback.sent', 'doc.import', 'doc.new'])

type Val = string | number | boolean | null | undefined
type Props = Record<string, Val | Record<string, number>>
interface Row { device_id: string; session_id: string; name: string; props: Props; area: string; path: string; device: string; browser: string; os: string; tz: string; lang: string; screen: string; installed: boolean; ver: string; app: string; internal: boolean }

let queue: Row[] = []
let sent = 0
let timer: ReturnType<typeof setTimeout> | null = null
let started = false
let errorsSent = 0
let human = false
const recentActions: string[] = []
// Recent error messages, kept only in memory. They leave the device only inside a bug report the person sends.
const recentErrors: string[] = []

const ls = {
  get(k: string) { try { return localStorage.getItem(k) } catch { return null } },
  set(k: string, v: string) { try { localStorage.setItem(k, v) } catch { /* ignore */ } },
  del(k: string) { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}
const ss = {
  get(k: string) { try { return sessionStorage.getItem(k) } catch { return null } },
  set(k: string, v: string) { try { sessionStorage.setItem(k, v) } catch { /* ignore */ } },
}

const rid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)

export function usageAllowed(): boolean {
  if (typeof window === 'undefined') return false
  if (ls.get(OFF_KEY) === '1') return false
  if (ss.get('vc-private') === '1') return false
  const n = navigator as any
  if (n.globalPrivacyControl === true || n.doNotTrack === '1' || (window as any).doNotTrack === '1') return false
  // Test runs and other automated browsers (Playwright, Puppeteer, Selenium) never count.
  if (n.webdriver === true && ls.get(TEST_KEY) !== '1') return false
  if (location.pathname.startsWith('/admin')) return false
  if (/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname) && !ls.get('vc-usage-dev')) return false
  return true
}
export function usageTurnedOff() { return ls.get(OFF_KEY) === '1' }
export function setUsageOff(off: boolean) { if (off) { ls.set(OFF_KEY, '1'); queue = [] } else ls.del(OFF_KEY) }
/** The team's own devices: their events are marked so the admin numbers show designers only. */
export function isInternalDevice() { return ls.get(INTERNAL_KEY) === '1' }
export function setInternalDevice(on: boolean) { if (on) ls.set(INTERNAL_KEY, '1'); else ls.del(INTERNAL_KEY) }

function deviceId(): { id: string; isNew: boolean } {
  let id = ls.get(DEVICE_KEY); let isNew = false
  if (!id) { id = rid(); ls.set(DEVICE_KEY, id); isNew = true }
  return { id, isNew }
}

function sessionId(): { id: string; isNew: boolean } {
  const now = Date.now()
  const raw = ss.get(SESSION_KEY)
  if (raw) { const [id, last] = raw.split('|'); if (id && now - Number(last) < SESSION_IDLE_MS) { ss.set(SESSION_KEY, `${id}|${now}`); return { id, isNew: false } } }
  const id = rid(); ss.set(SESSION_KEY, `${id}|${now}`); return { id, isNew: true }
}

export function areaOf(path: string) {
  const p = path.split('/')[1] || 'home'
  return ['studio', 'editor', 'effects', 'tools', 'admin'].includes(p) ? p : 'home'
}

function env() {
  const ua = navigator.userAgent
  const touch = navigator.maxTouchPoints > 1
  const w = Math.min(screen.width, screen.height)
  const device = /iPad/.test(ua) || (touch && /Macintosh/.test(ua)) || (touch && w >= 700) ? 'tablet' : /Mobi|Android|iPhone/.test(ua) ? 'mobile' : 'desktop'
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other'
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) || (touch && /Macintosh/.test(ua)) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other'
  let tz = ''
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { /* ignore */ }
  const installed = matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true
  return { device, browser, os, tz: tz.slice(0, 48), lang: (navigator.language || '').slice(0, 16), screen: `${screen.width}x${screen.height}`.slice(0, 16), installed: !!installed }
}

function clean(props?: Props): Props {
  const out: Props = {}
  if (!props) return out
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue
    if (v && typeof v === 'object') {
      const o: Record<string, number> = {}
      for (const [ik, iv] of Object.entries(v)) if (typeof iv === 'number' && Number.isFinite(iv)) o[ik.slice(0, 32)] = iv
      out[k.slice(0, 32)] = o
    } else out[k.slice(0, 32)] = typeof v === 'string' ? v.slice(0, 160) : v
  }
  return out
}

// ─── What happened in a session ────────────────────────────────────
// Counted on the device and sent as one `session.summary` row every five minutes and when the page is left.
// Each row covers the time since the one before, so the admin adds them up.

export interface Summary { eng: number; steps: Record<string, number>; undo: number; quick: number; ctl: Record<string, number>; exp: number; saves: number; saveMs: number; long: number; longMs: number; err: number }
export const blankSummary = (): Summary => ({ eng: 0, steps: {}, undo: 0, quick: 0, ctl: {}, exp: 0, saves: 0, saveMs: 0, long: 0, longMs: 0, err: 0 })
let sum = blankSummary()
let lastInput = 0
let snapshot: (() => Record<string, Val>) | null = null
/** Running totals for this page, never reset: dialogs compare them to know whether anything happened while open. */
const totals = { steps: 0, exports: 0 }

/** The Editor tells the summary how big the open design is (in buckets, never names). */
export function setSessionSnapshot(fn: (() => Record<string, Val>) | null) { snapshot = fn }
/** 0, 1, 2-5, 6-20, 21+: enough to tell a quick edit from a large design, nothing more. */
export function bucket(n: number) { return n <= 0 ? '0' : n === 1 ? '1' : n <= 5 ? '2-5' : n <= 20 ? '6-20' : '21+' }

/** The kind of an undo step, from its name. Only the kind is ever sent, never the name. */
export function stepKind(label: string): string {
  const l = label.toLowerCase()
  if (/board|format|cascade/.test(l)) return 'board'
  if (/text|font|type|letter|line spacing|paragraph|caps|kerning|word/.test(l)) return 'text'
  if (/effect|filter|adjust|style|shadow|glow|blur|grain|curves|levels|hue|satur|exposure|bright|vibrance|lut|look|bevel|overlay/.test(l)) return 'effect'
  if (/colou?r|fill|gradient|swatch|stroke|outline/.test(l)) return 'colour'
  if (/brush|paint|eras|clone|heal|dodge|burn|sponge|smudge|pencil|spot|patch/.test(l)) return 'paint'
  if (/mask|select|lasso|marquee/.test(l)) return 'select'
  if (/move|nudge|align|distribut|transform|resize|rotat|flip|scale|position|crop|size|warp|skew|perspective/.test(l)) return 'move'
  if (/layer|group|duplicate|delete|paste|cut|merge|lock|hide|show|rename|order|front|back|link|clip|rasteri|flatten|stamp|shape|image|photo|add|pathfinder|path/.test(l)) return 'layer'
  return 'other'
}

/** A new undo step. Opening or starting a design is not one. */
export function noteStep(label: string) {
  if (/^(new design|open|document)$/i.test(label)) return
  const k = stepKind(label)
  sum.steps[k] = (sum.steps[k] || 0) + 1
  totals.steps++
}

/** An undo. Undoing a step made under 3 seconds ago is a sign the step did not do what the person expected. */
export function noteUndo(label: string | undefined, ageMs: number) {
  sum.undo++
  if (label && ageMs >= 0 && ageMs < 3000) { sum.quick++; track('undo.quick', { kind: stepKind(label) }) }
}

const CONTROL_RE = /^[A-Za-z][A-Za-z0-9 ()%&/.,'+-]{0,31}$/
/** A panel control changed (by its label: "Size", "Fill", "Opacity"), so the panels can follow real use. */
export function noteControl(id: string | undefined | null) {
  const k = (id || '').trim()
  if (!CONTROL_RE.test(k)) return
  sum.ctl[k] = (sum.ctl[k] || 0) + 1
}

/** A save of the open design finished, and how long it took. */
export function noteSave(ms: number) { sum.saves++; sum.saveMs = Math.max(sum.saveMs, Math.round(ms)) }

/** How long something took, for the slow-operations list (opening the Editor, a design, an export). */
export function perf(what: string, ms: number) { if (Number.isFinite(ms) && ms >= 0) track('perf', { what, ms: Math.round(ms) }) }

export const usageTotals = () => ({ ...totals })
/** A dialog was opened and closed without changing the design or exporting. `id` is fixed in the code, never a title. */
export function noteAbandon(id: string) { track('panel.abandon', { id }) }

const misses = new Set<string>()
/** What may be sent from a search that found nothing: lower case, 32 characters, nothing that looks like an email or a number. */
export function cleanSearchMiss(q: string): string | null {
  const s = q.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 32).trim()
  if (s.length < 2) return null
  if (/@|\d{3,}|https?:|www\./.test(s)) return null
  return s
}
/** Command search found nothing for this. Sent once per wording per page. */
export function noteSearchMiss(q: string, where = 'editor') {
  const s = cleanSearchMiss(q); if (!s || misses.has(s)) return
  misses.add(s); track('search.none', { q: s, where })
}

/** Turns the counts into a summary row, or null when nothing happened since the last one. */
export function buildSummary(s: Summary, snap?: Record<string, Val> | null): Props | null {
  const eng = Math.round(s.eng / 1000)
  const n = Object.values(s.steps).reduce((a, b) => a + b, 0)
  if (eng < 1 && !n && !s.exp && !s.saves && !s.err && !s.undo && !s.long && !Object.keys(s.ctl).length) return null
  const top = (o: Record<string, number>, k: number) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k))
  return {
    eng, n, steps: top(s.steps, 12), undo: s.undo, quick: s.quick, ctl: top(s.ctl, 12),
    exp: s.exp, saves: s.saves, save_ms: s.saveMs, long: s.long, long_ms: s.longMs, err: s.err,
    ...(snap || {}),
  }
}

function sendSummary(beacon: boolean) {
  let snap: Record<string, Val> | null = null
  try { snap = snapshot?.() ?? null } catch { /* the Editor may be closing */ }
  const p = buildSummary(sum, snap); sum = blankSummary()
  if (!p) return
  track('session.summary', p)
  flush(beacon)
}

/** Record one anonymous event. Safe to call anywhere; does nothing on the server or when usage sharing is off. */
export function track(name: string, props?: Props) {
  if (name === 'export') { totals.exports++; sum.exp++ }
  if (!usageAllowed()) return
  if (sent + queue.length >= MAX_PER_SESSION) return
  if (name === 'action' && typeof props?.id === 'string') { recentActions.push(props.id); if (recentActions.length > 8) recentActions.shift() }
  const d = deviceId(); const s = sessionId()
  if (s.isNew && name !== 'session.start') startSession(d.isNew)
  const path = location.pathname.slice(0, 200)
  queue.push({ device_id: d.id, session_id: s.id, name, props: clean(props), area: areaOf(path), path, ...env(), ver: APP_VERSION, app: APP, internal: isInternalDevice() })
  if (!isHuman() && queue.length > MAX_HELD) queue = queue.slice(-MAX_HELD)
  if (URGENT.has(name)) { if (timer) clearTimeout(timer); timer = setTimeout(flush, 300) }
  else if (!timer) timer = setTimeout(flush, FLUSH_MS)
  if (queue.length >= 25) flush()
}

function startSession(firstVisit: boolean) {
  let ref = ''
  try { if (document.referrer) { const u = new URL(document.referrer); if (u.host !== location.host) ref = u.host.replace(/^www\./, '') } } catch { /* ignore */ }
  const q = new URLSearchParams(location.search)
  track('session.start', { first: firstVisit, ref, utm: q.get('utm_source') || q.get('ref') || '', app: APP })
}

function isHuman() { if (!human && ss.get(HUMAN_KEY) === '1') human = true; return human }
function markHuman() { if (isHuman()) return; human = true; ss.set(HUMAN_KEY, '1'); flush() }

function post(rows: Row[], beacon: boolean) {
  const body = JSON.stringify(rows)
  try {
    fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST', keepalive: beacon || body.length < 60000,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body,
    }).catch(() => {})
  } catch { /* ignore */ }
}

export function flush(beacon = false) {
  if (timer) { clearTimeout(timer); timer = null }
  if (!queue.length) return
  if (!isHuman()) {
    // Held until the person does something: a page that is only loaded (by a crawler, or opened and left) sends
    // nothing. Errors still go, marked as before any input, because an error may be why the page was left.
    const errs = queue.filter(r => r.name === 'error'); if (!errs.length) return
    queue = queue.filter(r => r.name !== 'error'); sent += errs.length; post(errs, beacon); return
  }
  const rows = queue; queue = []; sent += rows.length
  post(rows, beacon)
}

// ─── Input, rage clicks and slow moments ───────────────────────────

function onInput(e: Event) {
  if (!e.isTrusted) return
  markHuman()
  const now = Date.now()
  if (lastInput && document.visibilityState === 'visible') sum.eng += Math.max(0, Math.min(now - lastInput, ENGAGED_GAP_MS))
  lastInput = now
}

/** Where a rage click landed, in fixed words only: never a label, a name or text from the page. */
function describeTarget(t: EventTarget | null): string {
  const el = t as Element | null
  if (!el || typeof el.closest !== 'function') return 'page'
  if (el.closest('canvas')) return 'canvas'
  const tagged = el.closest('[data-track]')?.getAttribute('data-track')
  if (tagged && CONTROL_RE.test(tagged)) return tagged
  const ctl = el.closest('button,a,select,input,[role]')
  const kind = ctl ? (ctl.getAttribute('role') || ctl.tagName.toLowerCase()) : el.tagName.toLowerCase()
  return kind.replace(/[^a-z-]/g, '').slice(0, 24) || 'page'
}

const clicks: { t: number; x: number; y: number }[] = []
let lastRage = 0
/** Four clicks within 1.5 seconds on the same spot: something did not respond the way the person expected. */
export function isRage(list: { t: number; x: number; y: number }[], now: number): boolean {
  const recent = list.filter(c => now - c.t <= 1500)
  if (recent.length < 4) return false
  const last = recent[recent.length - 1]
  return recent.every(c => Math.hypot(c.x - last.x, c.y - last.y) < 24)
}
function onPointerDown(e: PointerEvent) {
  if (!e.isTrusted) return
  const el = e.target as Element | null
  if (el && typeof el.closest === 'function' && el.closest('input,textarea,[contenteditable="true"]')) return
  const now = Date.now()
  clicks.push({ t: now, x: e.clientX, y: e.clientY }); while (clicks.length > 6) clicks.shift()
  if (now - lastRage > 5000 && isRage(clicks, now)) { lastRage = now; clicks.length = 0; track('rage', { on: describeTarget(e.target) }) }
}

/** Set up session, page-leave flush and error capture. Call once from the root layout. */
export function initAnalytics() {
  if (started || typeof window === 'undefined') return
  started = true
  const leave = () => { sendSummary(true); flush(true) }
  addEventListener('pagehide', leave)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { lastInput = 0; leave() } })
  for (const t of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) addEventListener(t, onInput, { capture: true, passive: true })
  addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
  setInterval(() => sendSummary(false), SUMMARY_MS)
  try {
    const PO = (window as any).PerformanceObserver
    if (PO?.supportedEntryTypes?.includes('longtask')) {
      new PO((list: any) => { for (const en of list.getEntries()) if (en.duration >= 200) { sum.long++; sum.longMs = Math.max(sum.longMs, Math.round(en.duration)) } }).observe({ type: 'longtask', buffered: false })
    }
  } catch { /* not supported */ }
  const seen = new Set<string>()
  const report = (msg: string, src: string) => {
    if (errorsSent >= 10) return
    const m = String(msg || 'Unknown error').replace(/https?:\/\/\S+/g, '[url]').replace(/blob:\S+/g, '[blob]').slice(0, 160)
    if (!/ResizeObserver loop|Script error\.?$/.test(m) && recentErrors[recentErrors.length - 1] !== m) { recentErrors.push(m); if (recentErrors.length > 5) recentErrors.shift() }
    if (/ResizeObserver loop|Script error\.?$/.test(m) || seen.has(m)) return
    seen.add(m); errorsSent++; sum.err++
    track('error', { msg: m, src, pre: !isHuman() })
  }
  addEventListener('error', e => report(e.message, 'window'))
  addEventListener('unhandledrejection', e => report((e.reason && (e.reason.message || String(e.reason))) || 'Promise rejected', 'promise'))
  addEventListener('appinstalled', () => track('pwa.install'))
}

/** Last few commands, sent with feedback so a message like "it broke" has some context. */
export function recentActionIds() { return [...recentActions] }

export async function sendFeedback(f: { mood: 1 | 2 | 3 | null; message: string; email: string; trigger: string }): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const d = deviceId(); const s = sessionId()
  const path = location.pathname.slice(0, 200)
  const e = env()
  const row = {
    device_id: d.id, session_id: s.id, mood: f.mood, message: f.message.trim().slice(0, 2000) || null, email: f.email.trim().slice(0, 200) || null,
    area: areaOf(path), path,
    context: { trigger: f.trigger, ver: APP_VERSION, app: APP, device: e.device, browser: e.browser, os: e.os, screen: e.screen, tz: e.tz, installed: e.installed, recent: recentActions.slice(-5).join(',') },
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) })
    if (r.ok) track('feedback.sent', { mood: f.mood ?? 0, has_text: !!row.message, trigger: f.trigger })
    return r.ok
  } catch { return false }
}

/** Ask for feedback from anywhere: window.dispatchEvent(new CustomEvent('vc:feedback')). */
export function openFeedback(trigger = 'button') { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('vc:feedback', { detail: { trigger } })) }

/** After a person's second export, ask once how it went. */
export function noteExportForPrompt() {
  const n = Number(ls.get('vc-exports') || '0') + 1
  ls.set('vc-exports', String(n))
  if (n >= 2 && !ls.get('vc-asked')) { ls.set('vc-asked', '1'); setTimeout(() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('vc:feedback', { detail: { trigger: 'after-export', quick: true } })) }, 1200) }
}

export interface BugReport {
  summary: string; steps: string; expected: string
  where: string; severity: string; frequency: string
  email: string; details: boolean
}

/** What a bug report attaches when "Include technical details" is on. Shown to the person before sending. */
export function bugDetails() {
  if (typeof window === 'undefined') return null
  const e = env()
  return {
    page: location.pathname.slice(0, 200), version: `${APP_VERSION} ${APP}`, device: e.device, browser: e.browser, os: e.os, screen: e.screen,
    window: `${innerWidth}x${innerHeight}`, installed: e.installed, lang: e.lang, tz: e.tz,
    recent: recentActions.slice(-5).join(','), errors: recentErrors.join(' | ').slice(0, 800),
  }
}

/** Sends a bug report through the feedback table, marked kind: bug. Works even when usage counts are off,
 *  because the person chose to send it. Never includes images, file names or design content. */
export async function sendBugReport(b: BugReport, fromPath?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const d = deviceId(); const s = sessionId()
  const path = (fromPath || location.pathname).slice(0, 200)
  const body = [
    b.summary.trim(),
    b.steps.trim() && `Steps:\n${b.steps.trim()}`,
    b.expected.trim() && `Expected:\n${b.expected.trim()}`,
  ].filter(Boolean).join('\n\n').slice(0, 2000)
  const det = b.details ? bugDetails() : null
  const row = {
    device_id: d.id, session_id: s.id, mood: null, message: `[Bug] ${body}`.slice(0, 2000), email: b.email.trim().slice(0, 200) || null,
    area: areaOf(path), path,
    context: { trigger: 'bug-report', kind: 'bug', where: b.where, severity: b.severity, frequency: b.frequency, ...(det ? { ...det, page: path } : { details: 'withheld' }) },
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) })
    if (r.ok) track('bug.sent', { where: b.where, severity: b.severity })
    return r.ok
  } catch { return false }
}

/** Opens the bug report box from anywhere in the app. */
export function openBugReport(trigger = 'menu') { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('vc:bug', { detail: { trigger } })) }
