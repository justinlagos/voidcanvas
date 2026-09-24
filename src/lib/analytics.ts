// Anonymous usage counts and feedback.
// What is sent: event names (for example "export"), small settings (file type, tool id), page area, device type,
// browser, time zone and screen size, plus a random id for this browser. Never images, file names, text or layer content.
// Off in a private session, when Do Not Track or Global Privacy Control is on, and when the person turns it off.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_VC_SUPABASE_URL || 'https://fpmyuqjiwckcjaufwwit.supabase.co'
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_VC_SUPABASE_KEY || 'sb_publishable_c2MeeGrEJLlIwDf6xXzSMg_pk4aGyAv'

const OFF_KEY = 'vc-usage-off'
const DEVICE_KEY = 'vc-device'
const SESSION_KEY = 'vc-session'
const SESSION_IDLE_MS = 30 * 60 * 1000
const MAX_PER_SESSION = 600
const FLUSH_MS = 3000
const URGENT = new Set(['session.start', 'export', 'export.failed', 'error', 'feedback.sent', 'doc.import', 'doc.new'])

type Props = Record<string, string | number | boolean | null | undefined>
interface Row { device_id: string; session_id: string; name: string; props: Props; area: string; path: string; device: string; browser: string; os: string; tz: string; lang: string; screen: string; installed: boolean }

let queue: Row[] = []
let sent = 0
let timer: ReturnType<typeof setTimeout> | null = null
let started = false
let errorsSent = 0
const recentActions: string[] = []

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
  if (location.pathname.startsWith('/admin')) return false
  if (/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname) && !ls.get('vc-usage-dev')) return false
  return true
}
export function usageTurnedOff() { return ls.get(OFF_KEY) === '1' }
export function setUsageOff(off: boolean) { if (off) { ls.set(OFF_KEY, '1'); queue = [] } else ls.del(OFF_KEY) }

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
    out[k.slice(0, 32)] = typeof v === 'string' ? v.slice(0, 160) : v
  }
  return out
}

/** Record one anonymous event. Safe to call anywhere; does nothing on the server or when usage sharing is off. */
export function track(name: string, props?: Props) {
  if (!usageAllowed()) return
  if (sent + queue.length >= MAX_PER_SESSION) return
  if (name === 'action' && typeof props?.id === 'string') { recentActions.push(props.id); if (recentActions.length > 8) recentActions.shift() }
  const d = deviceId(); const s = sessionId()
  if (s.isNew && name !== 'session.start') startSession(d.isNew)
  const path = location.pathname.slice(0, 200)
  queue.push({ device_id: d.id, session_id: s.id, name, props: clean(props), area: areaOf(path), path, ...env() })
  if (URGENT.has(name)) { if (timer) clearTimeout(timer); timer = setTimeout(flush, 300) }
  else if (!timer) timer = setTimeout(flush, FLUSH_MS)
  if (queue.length >= 25) flush()
}

function startSession(firstVisit: boolean) {
  let ref = ''
  try { if (document.referrer) { const u = new URL(document.referrer); if (u.host !== location.host) ref = u.host.replace(/^www\./, '') } } catch { /* ignore */ }
  const q = new URLSearchParams(location.search)
  track('session.start', { first: firstVisit, ref, utm: q.get('utm_source') || q.get('ref') || '' })
}

export function flush(beacon = false) {
  if (timer) { clearTimeout(timer); timer = null }
  if (!queue.length) return
  const rows = queue; queue = []; sent += rows.length
  const body = JSON.stringify(rows)
  try {
    fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST', keepalive: beacon || body.length < 60000,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body,
    }).catch(() => {})
  } catch { /* ignore */ }
}

/** Set up session, page-leave flush and error capture. Call once from the root layout. */
export function initAnalytics() {
  if (started || typeof window === 'undefined') return
  started = true
  const leave = () => flush(true)
  addEventListener('pagehide', leave)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave() })
  const seen = new Set<string>()
  const report = (msg: string, src: string) => {
    if (errorsSent >= 10) return
    const m = String(msg || 'Unknown error').replace(/https?:\/\/\S+/g, '[url]').replace(/blob:\S+/g, '[blob]').slice(0, 160)
    if (/ResizeObserver loop|Script error\.?$/.test(m) || seen.has(m)) return
    seen.add(m); errorsSent++
    track('error', { msg: m, src })
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
    context: { trigger: f.trigger, device: e.device, browser: e.browser, os: e.os, screen: e.screen, tz: e.tz, installed: e.installed, recent: recentActions.slice(-5).join(',') },
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
