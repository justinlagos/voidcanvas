// Unified-slice rollout gate. Deliberately stricter than a query flag:
// - Disabled by default everywhere (including with no browser APIs).
// - `?unified=1` works ONLY on non-production hosts (localhost, deploy
//   previews, desktop). On the production host it is ignored, so a shared
//   link can never accidentally activate unfinished functionality.
// - Opt-in state lives in sessionStorage (this tab only): scoped, never
//   persisted across restarts, revocable at any time with `?unified=0` or
//   revokeUnifiedOptIn(). No localStorage, no cookies.
// - requestUnifiedOptIn() is the programmatic path (devtools/settings UI)
//   and works ONLY on non-production hosts. On production it refuses: there
//   is no entitlement system yet, so nothing may enable unfinished UI there,
//   not even via the console. Production enablement awaits an
//   entitlement-gated settings control (future work). The opt-in grants no
//   permissions by itself regardless: every future protected operation must
//   still enforce permissions server-side (never trust client-side flags).
// - When disabled, all unified UI returns null and no unified code runs
//   against the document: no side effects, no state leaks.
const PROD_HOSTS = new Set(['voidcanvas.app', 'www.voidcanvas.app'])
const SESSION_KEY = 'vc.unified.session'

interface GateWindow {
  location: { hostname: string; search: string }
  sessionStorage?: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void }
}

function gateWindow(): GateWindow | null {
  if (typeof window === 'undefined') return null
  try {
    const w = window as unknown as GateWindow
    if (!w.location) return null
    return w
  } catch { return null }
}

export function isProductionHost(hostname: string): boolean {
  return PROD_HOSTS.has(hostname.toLowerCase())
}

function readSession(w: GateWindow): boolean {
  try { return (w.sessionStorage?.getItem(SESSION_KEY) ?? null) === '1' } catch { return false }
}

function writeSession(w: GateWindow, on: boolean): void {
  try {
    if (!w.sessionStorage) return
    if (on) w.sessionStorage.setItem(SESSION_KEY, '1')
    else w.sessionStorage.removeItem(SESSION_KEY)
  } catch { /* storage unavailable: stay disabled unless re-requested */ }
}

/** Programmatic opt-in (settings UI / console). Works on any host. */
export function requestUnifiedOptIn(): boolean {
  const w = gateWindow()
  if (!w) return false
  if (isProductionHost(w.location.hostname)) return false
  writeSession(w, true)
  return readSession(w)
}

/** Revoke the opt-in for this tab. */
export function revokeUnifiedOptIn(): void {
  const w = gateWindow()
  if (w) writeSession(w, false)
}

export function unifiedEnabled(): boolean {
  const w = gateWindow()
  if (!w) return false
  let param: string | null = null
  try { param = new URLSearchParams(w.location.search).get('unified') } catch { param = null }
  if (param === '0') {
    writeSession(w, false) // explicit revocation wins over everything
    return false
  }
  if (readSession(w)) return true
  if (param === '1' && !isProductionHost(w.location.hostname)) {
    writeSession(w, true) // tab-scoped only
    return true
  }
  return false
}

export function unifiedSnapshot(): { enabled: boolean } { return { enabled: unifiedEnabled() } }
