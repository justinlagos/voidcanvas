// Settings sync: interface preferences follow the person to every device they sign in on.
// The settings are sealed with the account key before they leave the device; the server stores ciphertext.
// Last change wins. Only these keys are synced; designs, brand kits and anything private to a device are not.

import { accountRest, currentAccountKey, currentUserId, thisDeviceId } from './account'
import { openJson, sealJson } from './vault'

export const SYNCED_KEYS = ['vc-ui-v1', 'vc-recent-colours', 'vc-landing-theme', 'vc-usage-off']
const STATE_KEY = 'vc-settings-sync'   // { hash, at } of the last version sent or received
const POLL_MS = 30_000
const PULL_MS = 5 * 60_000

type Snapshot = Record<string, string | null>
interface Row { ciphertext: string; device_id: string | null; updated_at: string }

function snapshot(): Snapshot {
  const out: Snapshot = {}
  for (const k of SYNCED_KEYS) { try { out[k] = localStorage.getItem(k) } catch { out[k] = null } }
  return out
}
const hash = (s: Snapshot) => JSON.stringify(SYNCED_KEYS.map(k => s[k]))
function readState(): { hash: string; at: number } | null { try { const s = localStorage.getItem(STATE_KEY); return s ? JSON.parse(s) : null } catch { return null } }
function writeState(h: string, at: number) { try { localStorage.setItem(STATE_KEY, JSON.stringify({ hash: h, at })) } catch { /* ignore */ } }

const aad = () => `settings:${currentUserId()}`

async function push(s: Snapshot) {
  const key = currentAccountKey(); if (!key) return
  const ciphertext = await sealJson(key, s, aad())
  const rows = await accountRest<Row[]>('vc_settings', 'on_conflict=user_id&select=updated_at', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify({ ciphertext, device_id: thisDeviceId() }),
  })
  writeState(hash(s), Date.parse(rows?.[0]?.updated_at ?? new Date().toISOString()))
}

function apply(s: Snapshot) {
  for (const k of SYNCED_KEYS) {
    try { const v = s[k]; if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* ignore */ }
  }
  window.dispatchEvent(new CustomEvent('vc:settings-synced'))
}

/** Send this device's settings now, sealed with the current account key (after the key changes). */
export async function pushSettingsNow() { await push(snapshot()) }

/** Compare with the server: take newer settings from another device, or send ours if they changed. */
export async function syncSettings(): Promise<'sent' | 'received' | 'same'> {
  const key = currentAccountKey(); if (!key) return 'same'
  const local = snapshot(), state = readState()
  const localChanged = !state || state.hash !== hash(local)
  const rows = await accountRest<Row[]>('vc_settings', 'select=ciphertext,device_id,updated_at')
  const remote = rows?.[0]
  if (!remote) { await push(local); return 'sent' }
  const remoteAt = Date.parse(remote.updated_at)
  const remoteNewer = !state || remoteAt > state.at
  if (remoteNewer && remote.device_id !== thisDeviceId() && (!localChanged || !state)) {
    // First sign-in on this device (no state) takes the account's settings; after that, unchanged local settings take newer remote ones.
    const s = await openJson<Snapshot>(key, remote.ciphertext, aad())
    apply(s); writeState(hash(snapshot()), remoteAt)
    return 'received'
  }
  if (localChanged) { await push(local); return 'sent' }
  return 'same'
}

let timers: ReturnType<typeof setInterval>[] = []
let lastPull = 0
const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - lastPull > 60_000) { lastPull = Date.now(); syncSettings().catch(() => {}) } else if (document.visibilityState === 'hidden') syncIfChanged() }
function syncIfChanged() { const st = readState(); if (!st || st.hash !== hash(snapshot())) syncSettings().catch(() => {}) }

export function startSettingsSync() {
  stopSettingsSync()
  lastPull = Date.now()
  syncSettings().catch(() => {})
  timers = [setInterval(syncIfChanged, POLL_MS), setInterval(() => { lastPull = Date.now(); syncSettings().catch(() => {}) }, PULL_MS)]
  document.addEventListener('visibilitychange', onVisible)
}

export function stopSettingsSync() {
  timers.forEach(clearInterval); timers = []
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
  try { localStorage.removeItem(STATE_KEY) } catch { /* ignore */ }
}
